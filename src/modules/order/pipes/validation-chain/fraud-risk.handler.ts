import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AbstractCheckoutHandler } from './abstract-checkout.handler';
import { CheckoutValidationContext } from './checkout-context';

@Injectable()
export class FraudRiskHandler extends AbstractCheckoutHandler {
  private readonly logger = new Logger(FraudRiskHandler.name);

  protected async validate(context: CheckoutValidationContext): Promise<void> {
    this.logger.debug(
      `[Validation Chain] 4. Performing Fraud Risk analysis for user: ${context.userId}`,
    );

    const totalQuantity = context.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // High velocity bulk order risk flag
    if (totalQuantity > 10) {
      throw new BadRequestException(
        `Order rejected by Anti-Fraud Engine: Maximum 10 total items allowed per checkout during Flash Sale.`,
      );
    }

    if (!context.paymentMethod) {
      throw new BadRequestException('Payment method is required.');
    }
  }
}

