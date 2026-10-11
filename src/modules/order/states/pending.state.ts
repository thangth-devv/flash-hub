import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  IOrderState,
  IOrderStateMachineContext,
} from './order-state.interface';

export class PendingState implements IOrderState {
  readonly status = OrderStatus.PENDING;

  reserve(context: IOrderStateMachineContext): void {
    context.updateStatus(OrderStatus.RESERVED);
  }

  pay(_context: IOrderStateMachineContext): void {
    throw new BadRequestException(
      'Invalid state transition: Cannot pay an order before inventory stock has been reserved.',
    );
  }

  cancel(context: IOrderStateMachineContext, reason: string): void {
    context.setStatusReason(reason);
    context.updateStatus(OrderStatus.CANCELLED);
  }
}

