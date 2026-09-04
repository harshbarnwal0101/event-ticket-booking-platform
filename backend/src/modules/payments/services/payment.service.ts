import crypto from 'crypto';
import Razorpay from 'razorpay';

export interface CreatePaymentOrderInput {
  amount: number;
  currency?: string;
  paymentMethod?: string;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'PENDING' | 'PAID';
  transactionId: string;
  gateway?: 'razorpay' | 'mock';
}

export interface RefundPaymentInput {
  paymentId: string;
  amount: number;
  currency?: string;
  notes?: Record<string, string>;
}

const getRazorpayClient = (): Razorpay | null => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export class PaymentService {
  async createOrder({ amount, currency = 'INR', paymentMethod = 'UPI' }: CreatePaymentOrderInput): Promise<PaymentOrder & { keyId?: string }> {
    const normalizedAmount = Number(amount);
    if (!normalizedAmount || normalizedAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const razorpayClient = getRazorpayClient();
    if (razorpayClient) {
      const amountInPaise = Math.round(normalizedAmount * 100);
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `booking_${Date.now()}`,
        payment_capture: true,
        notes: {
          paymentMethod,
        },
      });

      return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        paymentMethod,
        status: 'PENDING',
        transactionId: order.id,
        gateway: 'razorpay',
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    }

    const orderId = `PAY-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const transactionId = `TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    return {
      orderId,
      amount: Math.round(normalizedAmount * 100),
      currency,
      paymentMethod,
      status: 'PENDING',
      transactionId,
      gateway: 'mock',
    };
  }

  async verifyPayment(
    orderId: string,
    paymentId?: string,
    signature?: string
  ): Promise<{ success: boolean; message: string; orderId: string; transactionId?: string }> {
    if (!orderId) {
      throw new Error('Order details are missing for payment verification');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && paymentId && signature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        throw new Error('Invalid payment signature');
      }

      return {
        success: true,
        message: 'Payment verified successfully',
        orderId,
        transactionId: paymentId,
      };
    }

    return {
      success: true,
      message: 'Payment verified successfully',
      orderId,
      transactionId: paymentId || orderId,
    };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature?: string): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!keySecret) {
      return true;
    }

    if (!signature) {
      return false;
    }

    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      return expectedSignature === signature;
    }
  }

  async handleWebhook(rawBody: string | Buffer, signature?: string): Promise<{ success: boolean; message: string; event?: string; receivedAt: string }> {
    if (!rawBody) {
      throw new Error('Webhook payload is missing');
    }

    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    if (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = this.verifyWebhookSignature(payload, signature || '');
      if (!isValid) {
        throw new Error('Invalid Razorpay webhook signature');
      }
    }

    let eventData: any = {};
    try {
      eventData = JSON.parse(payload);
    } catch (error) {
      throw new Error('Webhook payload is not valid JSON');
    }

    return {
      success: true,
      message: 'Webhook received successfully',
      event: eventData?.event || 'payment.event',
      receivedAt: new Date().toISOString(),
    };
  }

  async refundPayment({ paymentId, amount, currency = 'INR', notes = {} }: RefundPaymentInput): Promise<{
    success: boolean;
    message: string;
    refundId?: string;
    status?: string;
    amount?: number;
    currency?: string;
    gateway: 'razorpay' | 'mock';
  }> {
    if (!paymentId) {
      throw new Error('Payment ID is required for a refund request');
    }

    const razorpayClient = getRazorpayClient();
    if (razorpayClient) {
      const refundAmount = Math.max(0, Math.round(Number(amount) || 0));
      const refund = (await razorpayClient.payments.refund(paymentId, {
        amount: refundAmount,
        notes,
      })) as any;

      return {
        success: true,
        message: 'Refund initiated successfully',
        refundId: refund?.id || `RFND-${Date.now().toString().slice(-8)}`,
        status: refund?.status || 'processed',
        amount: Number(refund?.amount ?? refundAmount),
        currency: refund?.currency || currency,
        gateway: 'razorpay',
      };
    }

    return {
      success: true,
      message: 'Refund processed successfully in mock mode',
      refundId: `RFND-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      status: 'processed',
      amount: Math.max(0, Math.round(Number(amount) || 0)),
      currency,
      gateway: 'mock',
    };
  }
}

export default new PaymentService();
