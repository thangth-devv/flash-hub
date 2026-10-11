import { Order, OrderStatus } from '../entities/order.entity';
import {
  IOrderState,
  IOrderStateMachineContext,
} from './order-state.interface';
import { PendingState } from './pending.state';
import { ReservedState } from './reserved.state';
import { PaidState } from './paid.state';
import { CancelledState } from './cancelled.state';

export class OrderStateMachine implements IOrderStateMachineContext {
  private currentState: IOrderState;

  constructor(private readonly order: Order) {
    this.currentState = this.createStateInstance(order.status);
  }

  private createStateInstance(status: OrderStatus): IOrderState {
    switch (status) {
      case OrderStatus.PENDING:
        return new PendingState();
      case OrderStatus.RESERVED:
        return new ReservedState();
      case OrderStatus.PAID:
        return new PaidState();
      case OrderStatus.CANCELLED:
        return new CancelledState();
      default:
        return new PendingState();
    }
  }

  getCurrentStatus(): OrderStatus {
    return this.currentState.status;
  }

  updateStatus(newStatus: OrderStatus): void {
    this.order.status = newStatus;
    this.currentState = this.createStateInstance(newStatus);
  }

  setStatusReason(reason: string): void {
    this.order.metadata = {
      ...this.order.metadata,
      statusReason: reason,
      statusChangedAt: new Date().toISOString(),
    };
  }

  reserve(): void {
    this.currentState.reserve(this);
  }

  pay(): void {
    this.currentState.pay(this);
  }

  cancel(reason = 'Order cancelled'): void {
    this.currentState.cancel(this, reason);
  }

  getOrder(): Order {
    return this.order;
  }
}
