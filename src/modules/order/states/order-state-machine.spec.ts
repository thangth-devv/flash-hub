import { BadRequestException } from '@nestjs/common';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderStateMachine } from './order-state-machine';

describe('OrderStateMachine (State Pattern)', () => {
  let order: Order;

  beforeEach(() => {
    order = new Order();
    order.id = 'ord-1';
    order.status = OrderStatus.PENDING;
    order.metadata = {};
  });

  it('should successfully transition PENDING -> RESERVED -> PAID (Happy Path)', () => {
    const sm = new OrderStateMachine(order);
    expect(sm.getCurrentStatus()).toBe(OrderStatus.PENDING);

    sm.reserve();
    expect(sm.getCurrentStatus()).toBe(OrderStatus.RESERVED);
    expect(order.status).toBe(OrderStatus.RESERVED);

    sm.pay();
    expect(sm.getCurrentStatus()).toBe(OrderStatus.PAID);
    expect(order.status).toBe(OrderStatus.PAID);
  });

  it('should prevent paying directly from PENDING state before stock is reserved', () => {
    const sm = new OrderStateMachine(order);
    expect(() => sm.pay()).toThrow(BadRequestException);
    expect(sm.getCurrentStatus()).toBe(OrderStatus.PENDING);
  });

  it('should allow cancelling from PENDING or RESERVED', () => {
    const sm1 = new OrderStateMachine(order);
    sm1.cancel('User changed mind');
    expect(sm1.getCurrentStatus()).toBe(OrderStatus.CANCELLED);
    expect(order.metadata.statusReason).toBe('User changed mind');

    const reservedOrder = new Order();
    reservedOrder.status = OrderStatus.RESERVED;
    const sm2 = new OrderStateMachine(reservedOrder);
    sm2.cancel('Payment timed out');
    expect(sm2.getCurrentStatus()).toBe(OrderStatus.CANCELLED);
  });

  it('should prevent direct cancellation of a PAID order', () => {
    order.status = OrderStatus.PAID;
    const sm = new OrderStateMachine(order);
    expect(() => sm.cancel('Cancel request')).toThrow(BadRequestException);
    expect(sm.getCurrentStatus()).toBe(OrderStatus.PAID);
  });

  it('should prevent any transition once order is in CANCELLED terminal state', () => {
    order.status = OrderStatus.CANCELLED;
    const sm = new OrderStateMachine(order);

    expect(() => sm.reserve()).toThrow(BadRequestException);
    expect(() => sm.pay()).toThrow(BadRequestException);
    expect(sm.getCurrentStatus()).toBe(OrderStatus.CANCELLED);
  });
});

