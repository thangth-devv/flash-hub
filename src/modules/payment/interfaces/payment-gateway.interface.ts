export interface ChargeRequest {
  orderId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface ChargeResult {
  transactionId: string;
  success: boolean;
  paymentUrl?: string;
  message?: string;
  rawResponse?: Record<string, any>;
}

export interface RefundRequest {
  orderId: string;
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  message?: string;
}

export interface IPaymentGateway {
  readonly gatewayName: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
}

