import { Injectable, Logger } from '@nestjs/common';
import {
  ChargeRequest,
  ChargeResult,
  IPaymentGateway,
  RefundRequest,
  RefundResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class StripeAdapter implements IPaymentGateway {
  readonly gatewayName = 'STRIPE';
  private readonly logger = new Logger(StripeAdapter.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(
      `[Stripe Adapter] Creating PaymentIntent for order ${request.orderId}, amount: ${request.amount} ${request.currency || 'USD'}`,
    );

    const transactionId = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      transactionId,
      success: true,
      paymentUrl: `https://checkout.stripe.com/pay/${transactionId}`,
      message: 'Stripe PaymentIntent created successfully',
      rawResponse: {
        id: transactionId,
        status: 'requires_payment_method',
      },
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(
      `[Stripe Adapter] Creating refund for transaction ${request.transactionId}`,
    );
    return {
      success: true,
      refundId: `re_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      message: 'Stripe refund processed successfully',
    };
  }
}

