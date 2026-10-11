import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { KafkaProducerService } from '../../../common/kafka/kafka.producer.service';
import { KAFKA_TOPICS } from '../../../common/constants/kafka.topics';

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isRunning = false;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {
    this.pollIntervalMs = this.configService.get<number>(
      'OUTBOX_POLL_INTERVAL_MS',
      1000,
    );
  }

  onModuleInit(): void {
    this.isRunning = true;
    this.scheduleNextPoll();
    this.logger.log(
      `Outbox Publisher Worker started (polling every ${this.pollIntervalMs}ms)`,
    );
  }

  onModuleDestroy(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('Outbox Publisher Worker stopped');
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      try {
        await this.pollAndPublish();
      } catch (error: any) {
        this.logger.error(
          `Unexpected error during outbox polling tick: ${error?.message || error}`,
          error?.stack,
        );
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }

  async pollAndPublish(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let publishedCount = 0;

    try {
      const pendingEvents = await this.outboxService.findPendingEvents(50);
      if (pendingEvents.length === 0) {
        return 0;
      }

      this.logger.debug(
        `Discovered ${pendingEvents.length} pending outbox event(s) to publish`,
      );

      for (const event of pendingEvents) {
        const topic =
          event.payload?.topic ||
          (event.eventType === 'OrderCreated'
            ? KAFKA_TOPICS.ORDER_CREATED
            : `flashhub.${event.aggregateType.toLowerCase()}.${event.eventType.toLowerCase()}`);

        // Partition Key: Aggregate ID (order_id) guarantees exact sequential partition ordering
        const partitionKey = event.aggregateId;

        try {
          await this.kafkaProducerService.publish(
            topic,
            partitionKey,
            event.payload,
            {
              eventId: event.id,
              eventType: event.eventType,
              aggregateId: event.aggregateId,
            },
          );

          await this.outboxService.markAsPublished(event.id);
          publishedCount++;
        } catch (publishError: any) {
          await this.outboxService.markAsFailed(
            event.id,
            publishError?.message || String(publishError),
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return publishedCount;
  }
}

