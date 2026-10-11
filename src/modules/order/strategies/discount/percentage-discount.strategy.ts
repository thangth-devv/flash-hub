import { Injectable } from '@nestjs/common';
import {
  DiscountContext,
  IDiscountStrategy,
} from './discount-strategy.interface';

@Injectable()
export class PercentageDiscountStrategy implements IDiscountStrategy {
  readonly code = 'PERCENTAGE';

  private readonly percentageMap: Record<
    string,
    { percent: number; maxDiscount: number }
  > = {
    FLASH10: { percent: 0.1, maxDiscount: 500000 },
    FLASH20: { percent: 0.2, maxDiscount: 1000000 },
  };

  canApply(context: DiscountContext): boolean {
    if (!context.voucherCode) return false;
    return !!this.percentageMap[context.voucherCode.toUpperCase()];
  }

  calculate(context: DiscountContext): number {
    if (!context.voucherCode) return 0;
    const rule = this.percentageMap[context.voucherCode.toUpperCase()];
    if (!rule) return 0;

    const discount = context.rawTotal * rule.percent;
    return Math.min(discount, rule.maxDiscount);
  }
}

