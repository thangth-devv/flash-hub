import { Injectable, Logger } from '@nestjs/common';
import { UserBlacklistHandler } from './user-blacklist.handler';
import { FlashSaleLimitHandler } from './flash-sale-limit.handler';
import { StockAvailabilityHandler } from './stock-availability.handler';
import { FraudRiskHandler } from './fraud-risk.handler';
import { CheckoutValidationContext } from './checkout-context';

@Injectable()
export class CheckoutValidationPipeline {
  private readonly logger = new Logger(CheckoutValidationPipeline.name);

  constructor(
    private readonly userBlacklistHandler: UserBlacklistHandler,
    private readonly flashSaleLimitHandler: FlashSaleLimitHandler,
    private readonly stockAvailabilityHandler: StockAvailabilityHandler,
    private readonly fraudRiskHandler: FraudRiskHandler,
  ) {}

  async execute(context: CheckoutValidationContext): Promise<void> {
    this.logger.log(
      `Starting validation pipeline for user ${context.userId}...`,
    );

    // Assemble the Chain of Responsibility:
    // UserBlacklistHandler -> FlashSaleLimitHandler -> StockAvailabilityHandler -> FraudRiskHandler
    this.userBlacklistHandler
      .setNext(this.flashSaleLimitHandler)
      .setNext(this.stockAvailabilityHandler)
      .setNext(this.fraudRiskHandler);

    await this.userBlacklistHandler.handle(context);
    this.logger.log(`Validation pipeline completed successfully.`);
  }
}

