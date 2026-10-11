import { Injectable, Logger } from '@nestjs/common';
import {
  DiscountContext,
  IDiscountStrategy,
} from './discount-strategy.interface';
import { PercentageDiscountStrategy } from './percentage-discount.strategy';
import { FixedAmountDiscountStrategy } from './fixed-amount-discount.strategy';
import { VipTierDiscountStrategy } from './vip-tier-discount.strategy';

export interface DiscountCalculationResult {
  discountAmount: number;
  finalTotal: number;
  appliedStrategy?: string;
}

@Injectable()
export class DiscountStrategyContext {
  private readonly logger = new Logger(DiscountStrategyContext.name);
  private readonly strategies: IDiscountStrategy[];

  constructor(
    private readonly percentageStrategy: PercentageDiscountStrategy,
    private readonly fixedAmountStrategy: FixedAmountDiscountStrategy,
    private readonly vipTierStrategy: VipTierDiscountStrategy,
  ) {
    this.strategies = [
      this.percentageStrategy,
      this.fixedAmountStrategy,
      this.vipTierStrategy,
    ];
  }

  calculateDiscount(context: DiscountContext): DiscountCalculationResult {
    let maxDiscount = 0;
    let selectedStrategy: string | undefined;

    for (const strategy of this.strategies) {
      if (strategy.canApply(context)) {
        const discount = strategy.calculate(context);
        this.logger.debug(
          `Evaluated strategy "${strategy.code}": discount = ${discount}`,
        );
        if (discount > maxDiscount) {
          maxDiscount = discount;
          selectedStrategy = strategy.code;
        }
      }
    }

    // Safety cap: discount can never exceed rawTotal
    const safeDiscount = Math.min(maxDiscount, context.rawTotal);
    const finalTotal = Math.max(0, context.rawTotal - safeDiscount);

    return {
      discountAmount: safeDiscount,
      finalTotal,
      appliedStrategy: selectedStrategy,
    };
  }
}

