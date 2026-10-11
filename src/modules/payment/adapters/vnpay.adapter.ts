import { Injectable, Logger } from '@nestjs/common';
import {
  ChargeRequest,
  ChargeResult,
  IPaymentGateway,
  RefundRequest,
  RefundResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class VNPayAdapter implements IPaymentGateway {
  readonly gatewayName = 'VNPAY';
  private readonly logger = new Logger(VNPayAdapter.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(
      `[VNPay Adapter] Formatting and signing payment URL for order ${request.orderId}, amount: ${request.amount} VND`,
    );

    // Mock VNPay URL generation logic (vnp_TmnCode, vnp_Amount, vnp_SecureHash...)
    const transactionId = `VNPAY_TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const paymentUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${request.orderId}&vnp_Amount=${request.amount * 100}&vnp_BankCode=NCB`;

    return {
      transactionId,
      success: true,
      paymentUrl,
      message: 'VNPay payment redirect URL generated successfully',
      rawResponse: {
        vnp_ResponseCode: '00',
        vnp_TxnRef: request.orderId,
      },
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(
      `[VNPay Adapter] Requesting refund for order ${request.orderId}, tx: ${request.transactionId}`,
    );
    return {
      success: true,
      refundId: `VNPAY_REFUND_${Date.now()}`,
      message: 'VNPay refund request submitted successfully',
    };
  }
}

