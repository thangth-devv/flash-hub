import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Partitioners, Producer, RecordMetadata } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService.get<string[]>('kafka.brokers', [
      'localhost:29092',
    ]);
    const clientId = this.configService.get<string>(
      'kafka.clientId',
      'flashhub-producer',
    );

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      allowAutoTopicCreation: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka Producer successfully connected');
    } catch (error: any) {
      this.logger.warn(
        `Failed to connect Kafka Producer on startup (will retry on demand): ${error?.message || error}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.logger.log('Kafka Producer disconnected');
    }
  }

  async publish<T>(
    topic: string,
    key: string,
    payload: T,
    headers?: Record<string, string>,
  ): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
      } catch (err: any) {
        this.logger.error(`Unable to connect producer: ${err?.message || err}`);
        throw err;
      }
    }

    const value = Buffer.from(JSON.stringify(payload));
    const kafkaHeaders: Record<string, string> = {
      timestamp: new Date().toISOString(),
      ...headers,
    };

    try {
      const result = await this.producer.send({
        topic,
        messages: [
          {
            key,
            value,
            headers: kafkaHeaders,
          },
        ],
      });
      this.logger.debug(
        `Published message to topic "${topic}" with key "${key}"`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Error publishing message to topic "${topic}" with key "${key}": ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }
}
