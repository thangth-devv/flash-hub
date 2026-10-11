export interface DiscountContext {
  userId: string;
  rawTotal: number;
  voucherCode?: string;
  vipTier?: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export interface IDiscountStrategy {
  readonly code: string;
  canApply(context: DiscountContext): boolean;
  calculate(context: DiscountContext): number;
}

