import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  OutboxEvent,
  OutboxStatus,
} from '../entities/outbox-event.entity';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
  ) {}

  async findPendingEvents(
    limit = 50,
    maxRetries = 5,
  ): Promise<OutboxEvent[]> {
    return this.outboxRepository.find({
      where: {
        status: OutboxStatus.PENDING,
        retryCount: LessThan(maxRetries),
      },
      order: {
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  async markAsPublished(eventId: string): Promise<void> {
    await this.outboxRepository.update(eventId, {
      status: OutboxStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    this.logger.debug(`Outbox event ${eventId} marked as PUBLISHED`);
  }

  async markAsFailed(
    eventId: string,
    errorMessage: string,
    maxRetries = 5,
  ): Promise<void> {
    const event = await this.outboxRepository.findOneBy({ id: eventId });
    if (!event) return;

    const newRetryCount = event.retryCount + 1;
    const isExhausted = newRetryCount >= maxRetries;

    await this.outboxRepository.update(eventId, {
      retryCount: newRetryCount,
      status: isExhausted ? OutboxStatus.FAILED : OutboxStatus.PENDING,
    });

    this.logger.warn(
      `Outbox event ${eventId} failed (attempt ${newRetryCount}/${maxRetries}): ${errorMessage}`,
    );
  }
}

