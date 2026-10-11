import { jest } from '@jest/globals';
import { CheckoutFacade } from './checkout.facade';
import { OrderStatus } from '../entities/order.entity';
import { PaymentMethod } from '../../payment/factories/payment-gateway.factory';

describe('CheckoutFacade (Facade Pattern)', () => {
  let facade: CheckoutFacade;

  const mockDataSource = {
    transaction: jest.fn(async (cb: any) => {
      const mockManager = {
        save: jest.fn(async (_entityClass: any, entity: any) => {
          if (Array.isArray(entity)) return entity;
          if (!entity.id) entity.id = 'ord-created-uuid';
          return entity;
        }),
      };
      return cb(mockManager);
    }),
  } as any;

  const mockValidationPipeline = {
    execute: jest.fn(async (ctx: any) => {
      ctx.items[0].unitPrice = 200000;
    }),
  } as any;

  const mockDiscountContext = {
    calculateDiscount: jest.fn((_ctx: any) => ({
      discountAmount: 20000,
      finalTotal: 180000,
      appliedStrategy: 'PERCENTAGE',
    })),
  } as any;

  const mockPaymentGatewayFactory = {
    getGateway: jest.fn((method: string) => ({
      gatewayName: method,
    })),
  } as any;

  beforeEach(() => {
    facade = new CheckoutFacade(
      mockDataSource,
      mockValidationPipeline,
      mockDiscountContext,
      mockPaymentGatewayFactory,
    );
  });

  it('should orchestrate the full checkout lifecycle and return 202 Accepted response', async () => {
    const dto = {
      userId: 'user-123',
      items: [
        {
          productId: 'prod-123',
          quantity: 1,
        },
      ],
      paymentMethod: PaymentMethod.VNPAY,
      voucherCode: 'FLASH10',
    };

    const response = await facade.executeCheckout(dto, '192.168.1.1');

    expect(response.status).toBe(OrderStatus.PENDING);
    expect(response.totalAmount).toBe(180000);
    expect(response.discountAmount).toBe(20000);
    expect(response.appliedDiscountStrategy).toBe('PERCENTAGE');
    expect(response.trackingUrl).toContain('/orders/');
    expect(mockValidationPipeline.execute).toHaveBeenCalled();
    expect(mockDiscountContext.calculateDiscount).toHaveBeenCalled();
    expect(mockPaymentGatewayFactory.getGateway).toHaveBeenCalledWith(PaymentMethod.VNPAY);
    expect(mockDataSource.transaction).toHaveBeenCalled();
  });
});

