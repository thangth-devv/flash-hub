import { Injectable } from '@nestjs/common';
import {
  DiscountContext,
  IDiscountStrategy,
} from './discount-strategy.interface';

@Injectable()
export class FixedAmountDiscountStrategy implements IDiscountStrategy {
  readonly code = 'FIXED_AMOUNT';

  private readonly voucherMap: Record<string, number> = {
    SALE50K: 50000,
    SALE100K: 100000,
    SALE200K: 200000,
  };

  canApply(context: DiscountContext): boolean {
    if (!context.voucherCode) return false;
    return !!this.voucherMap[context.voucherCode.toUpperCase()];
  }

  calculate(context: DiscountContext): number {
    if (!context.voucherCode) return 0;
    const amount = this.voucherMap[context.voucherCode.toUpperCase()];
    if (!amount) return 0;

    return Math.min(amount, context.rawTotal);
  }
}

