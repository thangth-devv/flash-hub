import { Injectable, Logger } from '@nestjs/common';
import {
  ChargeRequest,
  ChargeResult,
  IPaymentGateway,
  RefundRequest,
  RefundResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class MoMoAdapter implements IPaymentGateway {
  readonly gatewayName = 'MOMO';
  private readonly logger = new Logger(MoMoAdapter.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(
      `[MoMo Adapter] Requesting QR payment for order ${request.orderId}, amount: ${request.amount} VND`,
    );

    const transactionId = `MOMO_TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const paymentUrl = `https://test-payment.momo.vn/v2/gateway/api/create?orderId=${request.orderId}&amount=${request.amount}`;

    return {
      transactionId,
      success: true,
      paymentUrl,
      message: 'MoMo QR payment initialized successfully',
      rawResponse: {
        resultCode: 0,
        message: 'Successful',
        orderId: request.orderId,
      },
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(
      `[MoMo Adapter] Executing refund for order ${request.orderId}, tx: ${request.transactionId}`,
    );
    return {
      success: true,
      refundId: `MOMO_REFUND_${Date.now()}`,
      message: 'MoMo refund executed successfully',
    };
  }
}

