import { Logger } from '@nestjs/common';

export function AuditLog(actionName?: string): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const logger = new Logger(className);
    const action = actionName || String(propertyKey);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      logger.log(`[AuditLog:Start] ${action} called`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.log(`[AuditLog:Success] ${action} finished in ${duration}ms`);
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error(
          `[AuditLog:Error] ${action} failed after ${duration}ms: ${error?.message || error}`,
          error?.stack,
        );
        throw error;
      }
    };

    return descriptor;
  };
}
