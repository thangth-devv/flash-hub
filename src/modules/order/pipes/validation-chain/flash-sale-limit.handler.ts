import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AbstractCheckoutHandler } from './abstract-checkout.handler';
import { CheckoutValidationContext } from './checkout-context';

@Injectable()
export class FlashSaleLimitHandler extends AbstractCheckoutHandler {
  private readonly logger = new Logger(FlashSaleLimitHandler.name);
  private static readonly MAX_QUANTITY_PER_FLASH_SALE_ITEM = 2;

  protected async validate(context: CheckoutValidationContext): Promise<void> {
    this.logger.debug(
      `[Validation Chain] 2. Checking Flash Sale quantity limit for user: ${context.userId}`,
    );

    for (const item of context.items) {
      if (item.quantity > FlashSaleLimitHandler.MAX_QUANTITY_PER_FLASH_SALE_ITEM) {
        throw new BadRequestException(
          `Flash Sale Limit Exceeded: Maximum ${FlashSaleLimitHandler.MAX_QUANTITY_PER_FLASH_SALE_ITEM} units allowed per item. Requested: ${item.quantity} for product ${item.productId}.`,
        );
      }
      if (item.quantity <= 0) {
        throw new BadRequestException(
          `Invalid item quantity: ${item.quantity}. Must be greater than 0.`,
        );
      }
    }
  }
}

