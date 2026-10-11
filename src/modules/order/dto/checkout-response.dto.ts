import { OrderStatus } from '../entities/order.entity';

export class CheckoutResponseDto {
  orderId: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  rawTotal: number;
  appliedDiscountStrategy?: string;
  paymentMethod: string;
  trackingUrl: string;
  message: string;
  createdAt: string;
}

