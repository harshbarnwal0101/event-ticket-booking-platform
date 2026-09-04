import { Router } from 'express';
import bookingController from '../controllers/booking.controller';
import { authenticateToken, isCustomer } from '../../auth/middleware/auth.middleware';

const router = Router();

router.get('/my-bookings', authenticateToken, isCustomer, (req, res) =>
  bookingController.getMyBookings(req, res)
);

router.post('/', authenticateToken, isCustomer, (req, res) =>
  bookingController.createBooking(req, res)
);

router.post('/:id/cancel', authenticateToken, isCustomer, (req, res) =>
  bookingController.cancelBooking(req, res)
);

export default router;
