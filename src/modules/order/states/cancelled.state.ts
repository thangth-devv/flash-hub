import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  IOrderState,
  IOrderStateMachineContext,
} from './order-state.interface';

export class CancelledState implements IOrderState {
  readonly status = OrderStatus.CANCELLED;

  reserve(_context: IOrderStateMachineContext): void {
    throw new BadRequestException(
      'Invalid state transition: Cannot reserve stock for a CANCELLED order.',
    );
  }

  pay(_context: IOrderStateMachineContext): void {
    throw new BadRequestException(
      'Invalid state transition: Cannot process payment for a CANCELLED order.',
    );
  }

  cancel(_context: IOrderStateMachineContext, _reason: string): void {
    // Idempotent: already cancelled
  }
}

