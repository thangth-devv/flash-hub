import { CheckoutValidationContext } from './checkout-context';

export interface ICheckoutHandler {
  setNext(handler: ICheckoutHandler): ICheckoutHandler;
  handle(context: CheckoutValidationContext): Promise<void>;
}

export abstract class AbstractCheckoutHandler implements ICheckoutHandler {
  private nextHandler: ICheckoutHandler | null = null;

  setNext(handler: ICheckoutHandler): ICheckoutHandler {
    this.nextHandler = handler;
    return handler;
  }

  async handle(context: CheckoutValidationContext): Promise<void> {
    await this.validate(context);

    if (this.nextHandler) {
      await this.nextHandler.handle(context);
    }
  }

  protected abstract validate(context: CheckoutValidationContext): Promise<void>;
}

