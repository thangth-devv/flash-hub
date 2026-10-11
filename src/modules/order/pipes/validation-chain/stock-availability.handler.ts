import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AbstractCheckoutHandler } from './abstract-checkout.handler';
import { CheckoutValidationContext } from './checkout-context';
import { ProductInventory } from '../../../inventory/entities/product-inventory.entity';

@Injectable()
export class StockAvailabilityHandler extends AbstractCheckoutHandler {
  private readonly logger = new Logger(StockAvailabilityHandler.name);

  constructor(
    @InjectRepository(ProductInventory)
    private readonly productInventoryRepository: Repository<ProductInventory>,
  ) {
    super();
  }

  protected async validate(context: CheckoutValidationContext): Promise<void> {
    this.logger.debug(
      `[Validation Chain] 3. Checking Stock Availability for ${context.items.length} item(s)`,
    );

    if (!context.items || context.items.length === 0) {
      throw new BadRequestException('Order must contain at least 1 item.');
    }

    const productIds = context.items.map((i) => i.productId);
    const inventories = await this.productInventoryRepository.findBy({
      productId: In(productIds),
    });

    const inventoryMap = new Map(
      inventories.map((inv) => [inv.productId, inv]),
    );

    for (const item of context.items) {
      const inv = inventoryMap.get(item.productId);
      if (!inv) {
        throw new NotFoundException(
          `Product with ID "${item.productId}" does not exist in inventory.`,
        );
      }

      if (inv.availableStock < item.quantity) {
        throw new BadRequestException(
          `Out of Stock: Product "${inv.name}" only has ${inv.availableStock} available units left (requested: ${item.quantity}).`,
        );
      }

      // Attach authoritative unit price from database inventory if not provided or to prevent client price tampering
      item.unitPrice = Number(inv.price);
    }
  }
}

