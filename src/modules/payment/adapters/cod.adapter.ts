import { Injectable, Logger } from '@nestjs/common';
import {
  ChargeRequest,
  ChargeResult,
  IPaymentGateway,
  RefundRequest,
  RefundResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class CODAdapter implements IPaymentGateway {
  readonly gatewayName = 'COD';
  private readonly logger = new Logger(CODAdapter.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(
      `[COD Adapter] Cash-on-delivery registered for order ${request.orderId}, amount: ${request.amount}`,
    );

    const transactionId = `COD_TX_${request.orderId}`;

    return {
      transactionId,
      success: true,
      message: 'Cash on Delivery confirmed. Payment to be collected upon arrival.',
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(
      `[COD Adapter] Cancelling COD transaction for order ${request.orderId}`,
    );
    return {
      success: true,
      refundId: `COD_CANCEL_${request.orderId}`,
      message: 'COD payment receipt cancelled',
    };
  }
}

