import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { authenticateToken } from '../../auth/middleware/auth.middleware';

const router = Router();

router.post('/create-order', authenticateToken, (req, res) =>
  paymentController.createOrder(req, res)
);

router.post('/verify', authenticateToken, (req, res) =>
  paymentController.verifyPayment(req, res)
);

router.post('/refund', authenticateToken, (req, res) =>
  paymentController.refundPayment(req, res)
);

router.post('/webhook', (req, res) =>
  paymentController.handleWebhook(req, res)
);

export default router;
