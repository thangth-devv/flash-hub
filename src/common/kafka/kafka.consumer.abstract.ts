import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';

@Injectable()
export abstract class AbstractKafkaConsumer<T = any>
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  protected kafka: Kafka;
  protected consumer: Consumer;
  protected isConnected = false;

  abstract readonly topic: string;
  abstract readonly groupId: string;

  constructor(protected readonly configService: ConfigService) {
    this.logger = new Logger(this.constructor.name);
  }

  async onModuleInit(): Promise<void> {
    const brokers = this.configService.get<string[]>('kafka.brokers', [
      'localhost:29092',
    ]);
    const clientId = `${this.groupId}-client`;

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
      allowAutoTopicCreation: true,
    });

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async (messagePayload: EachMessagePayload) => {
          await this.processMessage(messagePayload);
        },
      });

      this.isConnected = true;
      this.logger.log(
        `Subscribed to topic "${this.topic}" with consumer group "${this.groupId}"`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Kafka consumer could not initialize on startup: ${error?.message || error}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected && this.consumer) {
      await this.consumer.disconnect();
      this.logger.log(`Kafka Consumer "${this.groupId}" disconnected`);
    }
  }

  private async processMessage(
    messagePayload: EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message } = messagePayload;
    const key = message.key ? message.key.toString() : undefined;
    const valueStr = message.value ? message.value.toString() : '';

    try {
      let parsedValue: T;
      try {
        parsedValue = JSON.parse(valueStr) as T;
      } catch {
        parsedValue = valueStr as unknown as T;
      }

      const headers: Record<string, string> = {};
      if (message.headers) {
        for (const [hKey, hVal] of Object.entries(message.headers)) {
          if (hVal) {
            headers[hKey] = Buffer.isBuffer(hVal) ? hVal.toString() : String(hVal);
          }
        }
      }

      await this.handleMessage(parsedValue, key, headers);
    } catch (err: any) {
      this.logger.error(
        `Error processing message on topic ${topic} (partition ${partition}, offset ${message.offset}): ${err?.message || err}`,
        err?.stack,
      );
      // Consumer error hook for DLQ / retry handling
      await this.onError(err instanceof Error ? err : new Error(String(err)), messagePayload);
    }
  }

  abstract handleMessage(
    payload: T,
    key?: string,
    headers?: Record<string, string>,
  ): Promise<void>;

  protected async onError(
    _error: Error,
    _payload: EachMessagePayload,
  ): Promise<void> {
    // Default: subclass can override for DLQ publishing
  }
}
