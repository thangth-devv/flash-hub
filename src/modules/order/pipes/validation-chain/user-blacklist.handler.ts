import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AbstractCheckoutHandler } from './abstract-checkout.handler';
import { CheckoutValidationContext } from './checkout-context';

@Injectable()
export class UserBlacklistHandler extends AbstractCheckoutHandler {
  private readonly logger = new Logger(UserBlacklistHandler.name);

  // Sample blacklisted user IDs for demonstration
  private readonly blacklistedUserIds = new Set([
    '00000000-0000-0000-0000-000000000000',
    'deadbeef-0000-0000-0000-000000000000',
  ]);

  protected async validate(context: CheckoutValidationContext): Promise<void> {
    this.logger.debug(
      `[Validation Chain] 1. Checking User Blacklist for user: ${context.userId}`,
    );

    if (this.blacklistedUserIds.has(context.userId)) {
      this.logger.warn(`Rejected order for blacklisted user: ${context.userId}`);
      throw new ForbiddenException(
        `User ${context.userId} is blacklisted from participating in Flash Sales.`,
      );
    }
  }
}

