import { Request, Response } from 'express';
import bookingService from '../services/booking.service';

export class BookingController {
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { eventId, ticketTypeId, seatIds, paymentMethod } = req.body;
      const booking = await bookingService.createBooking({
        userId: req.user.userId,
        eventId,
        ticketTypeId,
        seatIds,
        paymentMethod,
      });

      const io = req.app.locals.io as any;
      if (io) {
        io.to(`event:${eventId}`).emit('seats:updated', {
          eventId,
          seatIds,
          status: 'BOOKED',
          bookingReference: booking.bookingReference,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Booking confirmed successfully',
        data: { booking },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create booking',
        errorCode: 'BOOKING_FAILED',
      });
    }
  }

  async getMyBookings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const bookings = await bookingService.getCustomerBookings(req.user.userId);
      res.status(200).json({
        success: true,
        data: { bookings },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch bookings',
        errorCode: 'FETCH_BOOKINGS_FAILED',
      });
    }
  }
}

export default new BookingController();
