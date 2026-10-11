import { Module } from '@nestjs/common';
import { VNPayAdapter } from './adapters/vnpay.adapter';
import { MoMoAdapter } from './adapters/momo.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';
import { CODAdapter } from './adapters/cod.adapter';
import { PaymentGatewayFactory } from './factories/payment-gateway.factory';

@Module({
  providers: [
    VNPayAdapter,
    MoMoAdapter,
    StripeAdapter,
    CODAdapter,
    PaymentGatewayFactory,
  ],
  exports: [PaymentGatewayFactory],
})
export class PaymentModule {}

