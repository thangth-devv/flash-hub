import { OrderStatus } from '../entities/order.entity';
import {
  IOrderState,
  IOrderStateMachineContext,
} from './order-state.interface';

export class ReservedState implements IOrderState {
  readonly status = OrderStatus.RESERVED;

  reserve(_context: IOrderStateMachineContext): void {
    // Already reserved (idempotent action)
  }

  pay(context: IOrderStateMachineContext): void {
    context.updateStatus(OrderStatus.PAID);
  }

  cancel(context: IOrderStateMachineContext, reason: string): void {
    context.setStatusReason(reason);
    context.updateStatus(OrderStatus.CANCELLED);
  }
}
