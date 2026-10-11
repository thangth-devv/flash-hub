import { OrderStatus } from '../entities/order.entity';

export interface IOrderStateMachineContext {
  updateStatus(newStatus: OrderStatus): void;
  setStatusReason(reason: string): void;
}

export interface IOrderState {
  readonly status: OrderStatus;
  reserve(context: IOrderStateMachineContext): void;
  pay(context: IOrderStateMachineContext): void;
  cancel(context: IOrderStateMachineContext, reason: string): void;
}

