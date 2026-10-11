import { Injectable } from '@nestjs/common';
import {
  DiscountContext,
  IDiscountStrategy,
} from './discount-strategy.interface';

@Injectable()
export class VipTierDiscountStrategy implements IDiscountStrategy {
  readonly code = 'VIP_TIER';

  private readonly vipRateMap: Record<string, number> = {
    SILVER: 0.05,
    GOLD: 0.1,
    PLATINUM: 0.15,
  };

  canApply(context: DiscountContext): boolean {
    if (!context.vipTier) return false;
    return !!this.vipRateMap[context.vipTier.toUpperCase()];
  }

  calculate(context: DiscountContext): number {
    if (!context.vipTier) return 0;
    const rate = this.vipRateMap[context.vipTier.toUpperCase()] || 0;
    return context.rawTotal * rate;
  }
}

