import { Types } from 'mongoose';
import Event, { EventStatus } from '../../events/models/Event';
import Seat, { SeatStatus } from '../../seats/models/Seat';
import TicketType from '../../tickets/models/TicketType';
import Booking, { BookingStatus, PaymentStatus } from '../models/Booking';

interface CreateBookingPayload {
  userId: string;
  eventId: string;
  ticketTypeId: string;
  seatIds: string[];
  paymentMethod?: string;
}

export class BookingService {
  async createBooking(payload: CreateBookingPayload): Promise<any> {
    const { userId, eventId, ticketTypeId, seatIds, paymentMethod = 'UPI' } = payload;

    if (!seatIds || seatIds.length === 0) {
      throw new Error('Please select at least one seat');
    }

    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new Error('This event is not open for booking');
    }

    if (event.ticketsAvailable < seatIds.length) {
      throw new Error('Not enough tickets available for this event');
    }

    const ticketType = await TicketType.findOne({
      _id: ticketTypeId,
      eventId: new Types.ObjectId(eventId),
      isActive: true,
    });

    if (!ticketType) {
      throw new Error('Ticket type not found for this event');
    }

    if (ticketType.availableQuantity < seatIds.length) {
      throw new Error('Selected ticket type does not have enough inventory left');
    }

    const uniqueSeatIds = [...new Set(seatIds)];
    if (uniqueSeatIds.length !== seatIds.length) {
      throw new Error('Duplicate seat selection is not allowed');
    }

    const seats = await Seat.find({
      _id: { $in: uniqueSeatIds.map((seatId) => new Types.ObjectId(seatId)) },
      eventId: new Types.ObjectId(eventId),
    }).sort({ row: 1, number: 1 });

    if (seats.length !== uniqueSeatIds.length) {
      throw new Error('One or more selected seats do not belong to this event');
    }

    const unavailableSeats = seats.filter((seat) => seat.status !== SeatStatus.AVAILABLE);
    if (unavailableSeats.length > 0) {
      throw new Error(`Seats ${unavailableSeats.map((seat) => seat.seatLabel).join(', ')} are no longer available`);
    }

    const bookingReference = `BK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const totalAmount = ticketType.price * uniqueSeatIds.length;

    const booking = await Booking.create({
      userId: new Types.ObjectId(userId),
      eventId: new Types.ObjectId(eventId),
      ticketTypeId: new Types.ObjectId(ticketTypeId),
      seatIds: uniqueSeatIds.map((seatId) => new Types.ObjectId(seatId)),
      seatLabels: seats.map((seat) => seat.seatLabel),
      quantity: uniqueSeatIds.length,
      unitPrice: ticketType.price,
      totalAmount,
      paymentMethod,
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      bookingReference,
    });

    await Seat.updateMany(
      { _id: { $in: uniqueSeatIds.map((seatId) => new Types.ObjectId(seatId)) } },
      {
        $set: {
          status: SeatStatus.BOOKED,
          ticketTypeId: new Types.ObjectId(ticketTypeId),
        },
      }
    );

    event.ticketsSold += uniqueSeatIds.length;
    event.ticketsAvailable = Math.max(0, event.ticketsAvailable - uniqueSeatIds.length);
    await event.save();

    ticketType.availableQuantity = Math.max(0, ticketType.availableQuantity - uniqueSeatIds.length);
    await ticketType.save();

    return {
      _id: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: booking.totalAmount,
      quantity: booking.quantity,
      eventId: booking.eventId,
      ticketTypeId: booking.ticketTypeId,
      seatLabels: booking.seatLabels,
      paymentMethod: booking.paymentMethod,
      createdAt: booking.createdAt,
    };
  }

  async getCustomerBookings(userId: string): Promise<any[]> {
    return Booking.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate('eventId', 'title category startDateTime basePrice status')
      .populate('ticketTypeId', 'name price')
      .lean();
  }
}

export default new BookingService();
