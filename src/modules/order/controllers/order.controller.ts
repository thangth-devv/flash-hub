import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CheckoutFacade } from '../facades/checkout.facade';
import { OrderService } from '../services/order.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { CheckoutResponseDto } from '../dto/checkout-response.dto';
import { Order } from '../entities/order.entity';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly checkoutFacade: CheckoutFacade,
    private readonly orderService: OrderService,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.ACCEPTED)
  async checkout(
    @Body() dto: CheckoutDto,
    @Req() req: Request,
  ): Promise<CheckoutResponseDto> {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.checkoutFacade.executeCheckout(dto, clientIp);
  }

  @Get(':id')
  async getOrder(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orderService.findById(id);
  }

  @Get(':id/status')
  async getOrderStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.getOrderStatus(id);
  }
}

