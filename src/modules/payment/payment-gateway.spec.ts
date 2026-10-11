import { BadRequestException } from '@nestjs/common';
import { VNPayAdapter } from './adapters/vnpay.adapter';
import { MoMoAdapter } from './adapters/momo.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';
import { CODAdapter } from './adapters/cod.adapter';
import {
  PaymentGatewayFactory,
  PaymentMethod,
} from './factories/payment-gateway.factory';

describe('Payment Module (Factory Method & Adapter Patterns)', () => {
  let factory: PaymentGatewayFactory;
  let vnpay: VNPayAdapter;
  let momo: MoMoAdapter;
  let stripe: StripeAdapter;
  let cod: CODAdapter;

  beforeEach(() => {
    vnpay = new VNPayAdapter();
    momo = new MoMoAdapter();
    stripe = new StripeAdapter();
    cod = new CODAdapter();
    factory = new PaymentGatewayFactory(vnpay, momo, stripe, cod);
  });

  describe('PaymentGatewayFactory', () => {
    it('should resolve the correct adapter instance for each payment method', () => {
      expect(factory.getGateway(PaymentMethod.VNPAY)).toBe(vnpay);
      expect(factory.getGateway(PaymentMethod.MOMO)).toBe(momo);
      expect(factory.getGateway(PaymentMethod.STRIPE)).toBe(stripe);
      expect(factory.getGateway(PaymentMethod.COD)).toBe(cod);
    });

    it('should throw BadRequestException for unsupported payment method', () => {
      expect(() => factory.getGateway('BITCOIN')).toThrow(BadRequestException);
    });
  });

  describe('Adapters', () => {
    const chargeRequest = {
      orderId: 'test-order-uuid',
      amount: 500000,
    };

    it('VNPayAdapter should generate payment redirect URL', async () => {
      const result = await vnpay.charge(chargeRequest);
      expect(result.success).toBe(true);
      expect(result.paymentUrl).toContain('sandbox.vnpayment.vn');
      expect(result.transactionId).toContain('VNPAY_TX_');
    });

    it('MoMoAdapter should generate MoMo payment URL', async () => {
      const result = await momo.charge(chargeRequest);
      expect(result.success).toBe(true);
      expect(result.paymentUrl).toContain('test-payment.momo.vn');
      expect(result.transactionId).toContain('MOMO_TX_');
    });

    it('StripeAdapter should create payment intent', async () => {
      const result = await stripe.charge(chargeRequest);
      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^pi_/);
      expect(result.paymentUrl).toContain('checkout.stripe.com');
    });

    it('CODAdapter should confirm cash on delivery', async () => {
      const result = await cod.charge(chargeRequest);
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(`COD_TX_${chargeRequest.orderId}`);
    });
  });
});

