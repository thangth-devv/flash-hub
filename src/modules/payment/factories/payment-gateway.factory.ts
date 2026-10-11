import { BadRequestException, Injectable } from '@nestjs/common';
import type { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { VNPayAdapter } from '../adapters/vnpay.adapter';
import { MoMoAdapter } from '../adapters/momo.adapter';
import { StripeAdapter } from '../adapters/stripe.adapter';
import { CODAdapter } from '../adapters/cod.adapter';

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  STRIPE = 'STRIPE',
  COD = 'COD',
}

@Injectable()
export class PaymentGatewayFactory {
  private readonly gatewayRegistry = new Map<string, IPaymentGateway>();

  constructor(
    private readonly vnpayAdapter: VNPayAdapter,
    private readonly momoAdapter: MoMoAdapter,
    private readonly stripeAdapter: StripeAdapter,
    private readonly codAdapter: CODAdapter,
  ) {
    this.register(PaymentMethod.VNPAY, this.vnpayAdapter);
    this.register(PaymentMethod.MOMO, this.momoAdapter);
    this.register(PaymentMethod.STRIPE, this.stripeAdapter);
    this.register(PaymentMethod.COD, this.codAdapter);
  }

  register(method: string, gateway: IPaymentGateway): void {
    this.gatewayRegistry.set(method.toUpperCase(), gateway);
  }

  getGateway(method: string): IPaymentGateway {
    const gateway = this.gatewayRegistry.get(method.toUpperCase());
    if (!gateway) {
      throw new BadRequestException(
        `Unsupported payment method: "${method}". Supported methods are: ${Array.from(
          this.gatewayRegistry.keys(),
        ).join(', ')}`,
      );
    }
    return gateway;
  }
}
