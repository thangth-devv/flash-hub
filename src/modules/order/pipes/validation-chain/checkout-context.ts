export interface CheckoutItemContext {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CheckoutValidationContext {
  userId: string;
  items: CheckoutItemContext[];
  paymentMethod: string;
  clientIp?: string;
  vipTier?: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
  metadata?: Record<string, any>;
}

