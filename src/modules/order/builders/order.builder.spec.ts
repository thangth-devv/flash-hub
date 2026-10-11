import { OrderBuilder } from './order.builder';
import { OrderStatus } from '../entities/order.entity';

describe('OrderBuilder (Builder Pattern)', () => {
  it('should build a valid Order with items and calculate correct totals', () => {
    const builder = new OrderBuilder();
    const { order, items, rawTotal } = builder
      .setUserId('123e4567-e89b-12d3-a456-426614174000')
      .setPaymentMethod('VNPAY')
      .setStatus(OrderStatus.PENDING)
      .addItem('prod-1', 2, 100000)
      .addItem('prod-2', 1, 50000)
      .applyDiscount(30000, 'PERCENTAGE')
      .setMetadata({ clientIp: '127.0.0.1' })
      .build();

    expect(rawTotal).toBe(250000); // 2*100k + 1*50k
    expect(order.discountAmount).toBe(30000);
    expect(order.totalAmount).toBe(220000);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.paymentMethod).toBe('VNPAY');
    expect(items).toHaveLength(2);
    expect(items[0].quantity).toBe(2);
    expect(items[0].unitPrice).toBe(100000);
    expect(order.metadata.clientIp).toBe('127.0.0.1');
    expect(order.metadata.discountStrategy).toBe('PERCENTAGE');
  });

  it('should throw an error if required fields are missing', () => {
    const builder = new OrderBuilder();
    expect(() => builder.build()).toThrow('OrderBuilder: userId is required');

    builder.setUserId('user-1');
    expect(() => builder.build()).toThrow(
      'OrderBuilder: paymentMethod is required',
    );

    builder.setPaymentMethod('COD');
    expect(() => builder.build()).toThrow(
      'OrderBuilder: at least one order item is required',
    );
  });
});

