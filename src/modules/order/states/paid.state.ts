import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  IOrderState,
  IOrderStateMachineContext,
} from './order-state.interface';

export class PaidState implements IOrderState {
  readonly status = OrderStatus.PAID;

  reserve(_context: IOrderStateMachineContext): void {
    throw new BadRequestException(
      'Invalid state transition: Cannot reserve stock for an already paid order.',
    );
  }

  pay(_context: IOrderStateMachineContext): void {
    // Idempotent action - already paid
  }

  cancel(_context: IOrderStateMachineContext, _reason: string): void {
    throw new BadRequestException(
      'Invalid state transition: Cannot directly cancel a paid order. Must initiate refund workflow first.',
    );
  }
}

