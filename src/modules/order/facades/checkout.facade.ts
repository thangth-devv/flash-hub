import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CheckoutDto } from '../dto/checkout.dto';
import { CheckoutResponseDto } from '../dto/checkout-response.dto';
import { CheckoutValidationPipeline } from '../pipes/validation-chain/checkout-validation.pipeline';
import { CheckoutValidationContext } from '../pipes/validation-chain/checkout-context';
import { DiscountStrategyContext } from '../strategies/discount/discount-strategy.context';
import { PaymentGatewayFactory } from '../../payment/factories/payment-gateway.factory';
import { OrderBuilder } from '../builders/order.builder';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OutboxEvent, OutboxStatus } from '../entities/outbox-event.entity';
import { KAFKA_TOPICS } from '../../../common/constants/kafka.topics';

@Injectable()
export class CheckoutFacade {
  private readonly logger = new Logger(CheckoutFacade.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly validationPipeline: CheckoutValidationPipeline,
    private readonly discountContext: DiscountStrategyContext,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
  ) {}

  async executeCheckout(
    dto: CheckoutDto,
    clientIp?: string,
  ): Promise<CheckoutResponseDto> {
    this.logger.log(`Executing checkout orchestration for user ${dto.userId}`);

    // 1. Verify Payment Gateway existence via Factory (Fail fast if unsupported)
    this.paymentGatewayFactory.getGateway(dto.paymentMethod);

    // 2. Execute Chain of Responsibility (Validation Pipeline)
    // Checks Blacklist -> Flash Sale Limits -> Stock Availability & fetches authoritative prices -> Fraud Risk
    const validationContext: CheckoutValidationContext = {
      userId: dto.userId,
      items: dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      paymentMethod: dto.paymentMethod,
      clientIp,
      vipTier: dto.vipTier,
    };
    await this.validationPipeline.execute(validationContext);

    // 3. Calculate raw total from verified unit prices
    const rawTotal = validationContext.items.reduce(
      (sum, item) => sum + item.quantity * (item.unitPrice || 0),
      0,
    );

    // 4. Apply Discount via Strategy Pattern
    const discountResult = this.discountContext.calculateDiscount({
      userId: dto.userId,
      rawTotal,
      voucherCode: dto.voucherCode,
      vipTier: dto.vipTier,
    });

    // 5. Assemble complex Order object using Builder Pattern
    const builder = new OrderBuilder();
    builder
      .setUserId(dto.userId)
      .setPaymentMethod(dto.paymentMethod)
      .setStatus(OrderStatus.PENDING)
      .applyDiscount(
        discountResult.discountAmount,
        discountResult.appliedStrategy,
      )
      .setMetadata({
        voucherCode: dto.voucherCode,
        vipTier: dto.vipTier,
        clientIp,
      });

    for (const item of validationContext.items) {
      builder.addItem(item.productId, item.quantity, item.unitPrice || 0);
    }

    const { order, items } = builder.build();

    // 6. Persist Order, Items, and OutboxEvent atomically in single PostgreSQL Transaction
    const savedOrder = await this.dataSource.transaction(
      async (transactionManager) => {
        // Save Order
        const createdOrder = await transactionManager.save(Order, order);

        // Associate items with saved order ID and persist
        for (const item of items) {
          item.orderId = createdOrder.id;
        }
        await transactionManager.save(OrderItem, items);

        // Create Transactional Outbox Event
        const outboxEvent = new OutboxEvent();
        outboxEvent.aggregateType = 'ORDER';
        outboxEvent.aggregateId = createdOrder.id;
        outboxEvent.eventType = 'OrderCreated';
        outboxEvent.status = OutboxStatus.PENDING;
        outboxEvent.payload = {
          topic: KAFKA_TOPICS.ORDER_CREATED,
          orderId: createdOrder.id,
          userId: createdOrder.userId,
          status: createdOrder.status,
          totalAmount: createdOrder.totalAmount,
          discountAmount: createdOrder.discountAmount,
          paymentMethod: createdOrder.paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          createdAt: new Date().toISOString(),
        };

        await transactionManager.save(OutboxEvent, outboxEvent);

        return createdOrder;
      },
    );

    this.logger.log(
      `Order ${savedOrder.id} and Outbox event saved atomically. Returning 202 Accepted.`,
    );

    return {
      orderId: savedOrder.id,
      status: savedOrder.status,
      totalAmount: Number(savedOrder.totalAmount),
      discountAmount: Number(savedOrder.discountAmount),
      rawTotal,
      appliedDiscountStrategy: discountResult.appliedStrategy,
      paymentMethod: savedOrder.paymentMethod,
      trackingUrl: `/orders/${savedOrder.id}/status`,
      message:
        'Order checkout accepted. Fulfillment pipeline is processing asynchronously.',
      createdAt: new Date().toISOString(),
    };
  }
}
