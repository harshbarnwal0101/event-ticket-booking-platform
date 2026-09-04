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
      const order = await paymentService.createOrder({
        amount: Number(amount),
        paymentMethod,
      });

      res.status(200).json({
        success: true,
        message: 'Payment order created successfully',
        data: { order, keyId: order.keyId || process.env.RAZORPAY_KEY_ID || null },
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

      const { orderId, paymentId, transactionId, signature } = req.body;
      const result = await paymentService.verifyPayment(orderId, paymentId || transactionId, signature);

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

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const rawBody = req.body;
      const signature = Array.isArray(req.headers['x-razorpay-signature'])
        ? req.headers['x-razorpay-signature'][0]
        : req.headers['x-razorpay-signature'];

      const payload = Buffer.isBuffer(rawBody) ? rawBody : typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
      const result = await paymentService.handleWebhook(payload, signature as string | undefined);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed',
        errorCode: 'WEBHOOK_FAILED',
      });
    }
  }

  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { paymentId, amount, currency, notes } = req.body;
      const result = await paymentService.refundPayment({
        paymentId,
        amount: Number(amount),
        currency,
        notes,
      });

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Refund processing failed',
        errorCode: 'REFUND_PAYMENT_FAILED',
      });
    }
  }
}

export default new PaymentController();
