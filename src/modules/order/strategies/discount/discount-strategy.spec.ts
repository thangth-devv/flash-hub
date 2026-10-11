import { PercentageDiscountStrategy } from './percentage-discount.strategy';
import { FixedAmountDiscountStrategy } from './fixed-amount-discount.strategy';
import { VipTierDiscountStrategy } from './vip-tier-discount.strategy';
import { DiscountStrategyContext } from './discount-strategy.context';

describe('Discount Strategy (Strategy Pattern)', () => {
  let percentageStrategy: PercentageDiscountStrategy;
  let fixedAmountStrategy: FixedAmountDiscountStrategy;
  let vipTierStrategy: VipTierDiscountStrategy;
  let context: DiscountStrategyContext;

  beforeEach(() => {
    percentageStrategy = new PercentageDiscountStrategy();
    fixedAmountStrategy = new FixedAmountDiscountStrategy();
    vipTierStrategy = new VipTierDiscountStrategy();
    context = new DiscountStrategyContext(
      percentageStrategy,
      fixedAmountStrategy,
      vipTierStrategy,
    );
  });

  describe('PercentageDiscountStrategy', () => {
    it('should calculate 10% discount for FLASH10 up to max 500k', () => {
      const result = percentageStrategy.calculate({
        userId: 'u1',
        rawTotal: 2000000,
        voucherCode: 'FLASH10',
      });
      expect(result).toBe(200000); // 10% of 2M
    });

    it('should cap at max 500k when 10% exceeds limit', () => {
      const result = percentageStrategy.calculate({
        userId: 'u1',
        rawTotal: 10000000,
        voucherCode: 'FLASH10',
      });
      expect(result).toBe(500000); // capped at 500k
    });
  });

  describe('FixedAmountDiscountStrategy', () => {
    it('should apply fixed discount amount for valid code', () => {
      const result = fixedAmountStrategy.calculate({
        userId: 'u1',
        rawTotal: 1000000,
        voucherCode: 'SALE100K',
      });
      expect(result).toBe(100000);
    });

    it('should not exceed rawTotal', () => {
      const result = fixedAmountStrategy.calculate({
        userId: 'u1',
        rawTotal: 50000,
        voucherCode: 'SALE100K',
      });
      expect(result).toBe(50000); // capped at total
    });
  });

  describe('VipTierDiscountStrategy', () => {
    it('should apply 15% discount for PLATINUM members', () => {
      const result = vipTierStrategy.calculate({
        userId: 'u1',
        rawTotal: 1000000,
        vipTier: 'PLATINUM',
      });
      expect(result).toBe(150000);
    });
  });

  describe('DiscountStrategyContext', () => {
    it('should select highest discount when multiple strategies can apply', () => {
      // FLASH10 gives 200k (10% of 2M), VIP PLATINUM gives 300k (15% of 2M)
      const calculation = context.calculateDiscount({
        userId: 'u1',
        rawTotal: 2000000,
        voucherCode: 'FLASH10',
        vipTier: 'PLATINUM',
      });

      expect(calculation.appliedStrategy).toBe('VIP_TIER');
      expect(calculation.discountAmount).toBe(300000);
      expect(calculation.finalTotal).toBe(1700000);
    });

    it('should return 0 discount when no voucher or VIP applies', () => {
      const calculation = context.calculateDiscount({
        userId: 'u1',
        rawTotal: 500000,
      });

      expect(calculation.discountAmount).toBe(0);
      expect(calculation.finalTotal).toBe(500000);
      expect(calculation.appliedStrategy).toBeUndefined();
    });
  });
});

