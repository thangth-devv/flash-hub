import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderStateMachine } from '../states/order-state-machine';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findById(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    return order;
  }

  async transitionState(
    orderId: string,
    action: 'reserve' | 'pay' | 'cancel',
    reason?: string,
  ): Promise<Order> {
    const order = await this.findById(orderId);
    const stateMachine = new OrderStateMachine(order);

    switch (action) {
      case 'reserve':
        stateMachine.reserve();
        break;
      case 'pay':
        stateMachine.pay();
        break;
      case 'cancel':
        stateMachine.cancel(reason || 'Cancelled');
        break;
    }

    return this.orderRepository.save(stateMachine.getOrder());
  }

  async getOrderStatus(
    orderId: string,
  ): Promise<{ orderId: string; status: OrderStatus; metadata: any }> {
    const order = await this.findById(orderId);
    return {
      orderId: order.id,
      status: order.status,
      metadata: order.metadata,
    };
  }
}
