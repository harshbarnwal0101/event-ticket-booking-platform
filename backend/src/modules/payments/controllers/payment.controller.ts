import { Request, Response } from 'express';
import paymentService from '../services/payment.service';

export class PaymentController {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { amount, paymentMethod } = req.body;
      const order = paymentService.createOrder({
        amount: Number(amount),
        paymentMethod,
      });

      res.status(200).json({
        success: true,
        message: 'Payment order created successfully',
        data: { order },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create payment order',
        errorCode: 'CREATE_PAYMENT_ORDER_FAILED',
      });
    }
  }

  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { orderId, transactionId } = req.body;
      const result = paymentService.verifyPayment(orderId, transactionId);

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Payment verification failed',
        errorCode: 'VERIFY_PAYMENT_FAILED',
      });
    }
  }
}

export default new PaymentController();
