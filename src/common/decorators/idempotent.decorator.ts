import { Logger } from '@nestjs/common';
import type { RedisService } from '../redis/redis.service';

export interface IdempotentOptions {
  /**
   * Field path in first argument or extraction function to determine unique key
   * E.g. 'orderId', 'messageId', or (args) => args[0].orderId
   */
  keyFrom?: string | ((args: any[]) => string);
  /**
   * Time to live for idempotency key in seconds (default: 86400 = 24h)
   */
  ttl?: number;
  /**
   * Prefix for Redis key namespace (default: 'idem')
   */
  prefix?: string;
}

export function Idempotent(options: IdempotentOptions = {}): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const logger = new Logger(className);
    const ttl = options.ttl ?? 86400; // 24 hours
    const prefix = options.prefix ?? 'idem';

    descriptor.value = async function (...args: any[]) {
      // 1. Resolve unique key
      let key: string | undefined;

      if (typeof options.keyFrom === 'function') {
        key = options.keyFrom(args);
      } else if (typeof options.keyFrom === 'string') {
        key = args[0]?.[options.keyFrom];
      } else {
        // Fallback automatic key detection
        key = args[0]?.messageId || args[0]?.orderId || args[0]?.id;
      }

      if (!key) {
        logger.warn(
          `[Idempotent] Unable to resolve idempotency key for ${String(propertyKey)}. Proceeding without idempotency guard.`,
        );
        return originalMethod.apply(this, args);
      }

      const redisKey = `${prefix}:${String(propertyKey)}:${key}`;
      const redisService: RedisService | undefined = (this as any).redisService;

      // 2. If RedisService is available on the class instance, check and acquire atomic lock
      if (redisService) {
        const isFirstTime = await redisService.setNx(
          redisKey,
          'PROCESSED',
          ttl,
        );

        if (!isFirstTime) {
          logger.warn(
            `[Idempotent:DuplicateDetected] Key "${redisKey}" was already processed. Skipping duplicate execution.`,
          );
          return;
        }
      }

      // 3. Execute original business method
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // On unhandled failure, optionally remove key if user needs automatic retry
        logger.error(
          `[Idempotent:Error] Execution failed for key "${redisKey}".`,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

