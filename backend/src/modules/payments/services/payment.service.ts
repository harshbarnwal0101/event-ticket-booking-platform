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
}

export class PaymentService {
  createOrder({ amount, currency = 'INR', paymentMethod = 'UPI' }: CreatePaymentOrderInput): PaymentOrder {
    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const orderId = `PAY-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const transactionId = `TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    return {
      orderId,
      amount,
      currency,
      paymentMethod,
      status: 'PENDING',
      transactionId,
    };
  }

  verifyPayment(orderId: string, transactionId: string): { success: boolean; message: string; orderId: string; transactionId: string } {
    if (!orderId || !transactionId) {
      throw new Error('Order details are missing for payment verification');
    }

    return {
      success: true,
      message: 'Payment verified successfully',
      orderId,
      transactionId,
    };
  }
}

export default new PaymentService();
