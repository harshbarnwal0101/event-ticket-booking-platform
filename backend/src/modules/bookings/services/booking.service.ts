import { Types } from 'mongoose';
import Event, { EventStatus } from '../../events/models/Event';
import Seat, { SeatStatus } from '../../seats/models/Seat';
import TicketType from '../../tickets/models/TicketType';
import paymentService from '../../payments/services/payment.service';
import Booking, { BookingStatus, PaymentStatus } from '../models/Booking';

interface CreateBookingPayload {
  userId: string;
  eventId: string;
  ticketTypeId: string;
  seatIds: string[];
  paymentMethod?: string;
  paymentId?: string;
  transactionId?: string;
}

export class BookingService {
  async createBooking(payload: CreateBookingPayload): Promise<any> {
    const { userId, eventId, ticketTypeId, seatIds, paymentMethod = 'UPI', paymentId, transactionId } = payload;

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
      paymentId: paymentId || undefined,
      transactionId: transactionId || undefined,
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
          holdUntil: null,
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

  async cancelBooking(bookingId: string, userId: string): Promise<any> {
    const booking = await Booking.findOne({
      _id: new Types.ObjectId(bookingId),
      userId: new Types.ObjectId(userId),
    }).populate('eventId').populate('ticketTypeId');

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('This booking has already been cancelled');
    }

    const event = await Event.findById(booking.eventId);
    if (event) {
      event.ticketsAvailable = Math.max(0, event.ticketsAvailable + booking.quantity);
      event.ticketsSold = Math.max(0, event.ticketsSold - booking.quantity);
      await event.save();
    }

    const ticketType = await TicketType.findById(booking.ticketTypeId);
    if (ticketType) {
      ticketType.availableQuantity = Math.max(0, ticketType.availableQuantity + booking.quantity);
      await ticketType.save();
    }

    const refundTarget = booking.paymentId || booking.transactionId || booking.bookingReference;
    if (booking.paymentStatus === PaymentStatus.PAID && refundTarget) {
      const refundResponse = await paymentService.refundPayment({
        paymentId: refundTarget,
        amount: Math.round(booking.totalAmount * 100),
        currency: 'INR',
        notes: {
          bookingReference: booking.bookingReference,
          reason: 'customer_cancelled',
        },
      });

      booking.refundId = refundResponse.refundId || booking.refundId || undefined;
      booking.paymentStatus = refundResponse.success ? PaymentStatus.REFUNDED : PaymentStatus.PAID;
    }

    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus = booking.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : booking.paymentStatus;
    await booking.save();

    await Seat.updateMany(
      { _id: { $in: booking.seatIds }, eventId: booking.eventId },
      {
        $set: {
          status: SeatStatus.AVAILABLE,
          ticketTypeId: null,
          holdUntil: null,
        },
      }
    );

    return {
      _id: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      refundId: booking.refundId,
      totalAmount: booking.totalAmount,
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
