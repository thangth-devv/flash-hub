import { Injectable, Logger } from '@nestjs/common';
import type {
  ChargeRequest,
  ChargeResult,
  IPaymentGateway,
  RefundRequest,
  RefundResult,
} from '../interfaces/payment-gateway.interface';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';

@Injectable()
export class MoMoAdapter implements IPaymentGateway {
  readonly gatewayName = 'MOMO';
  private readonly logger = new Logger(MoMoAdapter.name);

  @AuditLog('MoMo:Charge')
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

  @AuditLog('MoMo:Refund')
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
