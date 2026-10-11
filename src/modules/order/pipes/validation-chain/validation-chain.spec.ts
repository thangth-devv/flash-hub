import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserBlacklistHandler } from './user-blacklist.handler';
import { FlashSaleLimitHandler } from './flash-sale-limit.handler';
import { StockAvailabilityHandler } from './stock-availability.handler';
import { FraudRiskHandler } from './fraud-risk.handler';
import { CheckoutValidationPipeline } from './checkout-validation.pipeline';
import { ProductInventory } from '../../../inventory/entities/product-inventory.entity';

describe('Validation Chain (Chain of Responsibility Pattern)', () => {
  let blacklistHandler: UserBlacklistHandler;
  let flashSaleLimitHandler: FlashSaleLimitHandler;
  let stockHandler: StockAvailabilityHandler;
  let fraudHandler: FraudRiskHandler;
  let pipeline: CheckoutValidationPipeline;

  const mockProduct: ProductInventory = {
    productId: '11111111-1111-1111-1111-111111111111',
    name: 'iPhone 15 Pro Max',
    price: 30000000,
    totalStock: 100,
    reservedStock: 0,
    availableStock: 50,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventoryRepo = {
    findBy: jest.fn(async ({ productId }: any) => {
      if (productId?._value?.includes(mockProduct.productId)) {
        return [mockProduct];
      }
      return [];
    }),
  } as any;

  beforeEach(() => {
    blacklistHandler = new UserBlacklistHandler();
    flashSaleLimitHandler = new FlashSaleLimitHandler();
    stockHandler = new StockAvailabilityHandler(mockInventoryRepo);
    fraudHandler = new FraudRiskHandler();
    pipeline = new CheckoutValidationPipeline(
      blacklistHandler,
      flashSaleLimitHandler,
      stockHandler,
      fraudHandler,
    );
  });

  it('should throw ForbiddenException if user is blacklisted', async () => {
    const context = {
      userId: '00000000-0000-0000-0000-000000000000',
      items: [{ productId: mockProduct.productId, quantity: 1 }],
      paymentMethod: 'VNPAY',
    };

    await expect(pipeline.execute(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if item quantity exceeds Flash Sale limit (max 2)', async () => {
    const context = {
      userId: 'user-valid',
      items: [{ productId: mockProduct.productId, quantity: 3 }],
      paymentMethod: 'VNPAY',
    };

    await expect(pipeline.execute(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if product does not exist in inventory', async () => {
    const context = {
      userId: 'user-valid',
      items: [{ productId: 'non-existing-product-id', quantity: 1 }],
      paymentMethod: 'VNPAY',
    };

    await expect(pipeline.execute(context)).rejects.toThrow(NotFoundException);
  });

  it('should pass all checks for valid checkout and populate authoritative unit price', async () => {
    const context = {
      userId: 'user-valid',
      items: [{ productId: mockProduct.productId, quantity: 2 }],
      paymentMethod: 'VNPAY',
    };

    await pipeline.execute(context);
    expect(context.items[0].unitPrice).toBe(30000000);
  });
});
