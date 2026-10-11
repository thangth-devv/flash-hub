import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    this.client = new Redis({
      host,
      port,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis client successfully connected');
    } catch (error: any) {
      this.logger.warn(
        `Failed to connect Redis on startup (will retry on demand): ${error?.message || error}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis client disconnected');
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Set if Not Exists - critical for Idempotent Consumer & Distributed Locks
   * Returns true if the key was set (first time), false if key already exists
   */
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Distributed Lock Acquisition
   */
  async acquireLock(
    lockKey: string,
    lockValue: string,
    ttlSeconds = 10,
  ): Promise<boolean> {
    return this.setNx(`lock:${lockKey}`, lockValue, ttlSeconds);
  }

  /**
   * Distributed Lock Safe Release (Atomic Lua Script)
   */
  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(luaScript, 1, `lock:${lockKey}`, lockValue);
    return result === 1;
  }
}
