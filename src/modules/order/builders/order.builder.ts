import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

export interface BuiltOrderResult {
  order: Order;
  items: OrderItem[];
  rawTotal: number;
}

export class OrderBuilder {
  private userId!: string;
  private paymentMethod!: string;
  private status: OrderStatus = OrderStatus.PENDING;
  private discountAmount = 0;
  private metadata: Record<string, any> = {};
  private readonly items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }> = [];

  setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  setPaymentMethod(paymentMethod: string): this {
    this.paymentMethod = paymentMethod;
    return this;
  }

  setStatus(status: OrderStatus): this {
    this.status = status;
    return this;
  }

  addItem(productId: string, quantity: number, unitPrice: number): this {
    this.items.push({ productId, quantity, unitPrice });
    return this;
  }

  applyDiscount(discountAmount: number, strategyName?: string): this {
    this.discountAmount = Math.max(0, discountAmount);
    if (strategyName) {
      this.metadata.discountStrategy = strategyName;
    }
    return this;
  }

  setMetadata(metadata: Record<string, any>): this {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): BuiltOrderResult {
    if (!this.userId) {
      throw new Error('OrderBuilder: userId is required');
    }
    if (!this.paymentMethod) {
      throw new Error('OrderBuilder: paymentMethod is required');
    }
    if (this.items.length === 0) {
      throw new Error('OrderBuilder: at least one order item is required');
    }

    const rawTotal = this.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const safeDiscount = Math.min(this.discountAmount, rawTotal);
    const totalAmount = Math.max(0, rawTotal - safeDiscount);

    const order = new Order();
    order.userId = this.userId;
    order.status = this.status;
    order.paymentMethod = this.paymentMethod;
    order.discountAmount = safeDiscount;
    order.totalAmount = totalAmount;
    order.metadata = {
      ...this.metadata,
      rawTotal,
      builtAt: new Date().toISOString(),
    };

    const orderItems: OrderItem[] = this.items.map((item) => {
      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.unitPrice = item.unitPrice;
      return orderItem;
    });

    order.items = orderItems;

    return {
      order,
      items: orderItems,
      rawTotal,
    };
  }
}

