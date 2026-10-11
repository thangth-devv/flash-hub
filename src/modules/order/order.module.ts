import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { ProductInventory } from '../inventory/entities/product-inventory.entity';
import { PaymentModule } from '../payment/payment.module';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';
import { CheckoutFacade } from './facades/checkout.facade';

// Chain of Responsibility Handlers
import { UserBlacklistHandler } from './pipes/validation-chain/user-blacklist.handler';
import { FlashSaleLimitHandler } from './pipes/validation-chain/flash-sale-limit.handler';
import { StockAvailabilityHandler } from './pipes/validation-chain/stock-availability.handler';
import { FraudRiskHandler } from './pipes/validation-chain/fraud-risk.handler';
import { CheckoutValidationPipeline } from './pipes/validation-chain/checkout-validation.pipeline';

// Strategy Pattern Implementations
import { PercentageDiscountStrategy } from './strategies/discount/percentage-discount.strategy';
import { FixedAmountDiscountStrategy } from './strategies/discount/fixed-amount-discount.strategy';
import { VipTierDiscountStrategy } from './strategies/discount/vip-tier-discount.strategy';
import { DiscountStrategyContext } from './strategies/discount/discount-strategy.context';

// Transactional Outbox
import { OutboxService } from './outbox/outbox.service';
import { OutboxWorker } from './outbox/outbox.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OutboxEvent,
      ProductInventory,
    ]),
    PaymentModule,
  ],
  controllers: [OrderController],
  providers: [
    // Validation Pipeline (Chain of Responsibility)
    UserBlacklistHandler,
    FlashSaleLimitHandler,
    StockAvailabilityHandler,
    FraudRiskHandler,
    CheckoutValidationPipeline,

    // Discount Strategies (Strategy Pattern)
    PercentageDiscountStrategy,
    FixedAmountDiscountStrategy,
    VipTierDiscountStrategy,
    DiscountStrategyContext,

    // Orchestration & Services
    CheckoutFacade,
    OrderService,

    // Transactional Outbox Worker
    OutboxService,
    OutboxWorker,
  ],
  exports: [OrderService, CheckoutFacade, OutboxService],
})
export class OrderModule {}
