import { jest } from '@jest/globals';
import { OutboxWorker } from './outbox.worker';
import { OutboxEvent, OutboxStatus } from '../entities/outbox-event.entity';
import { KAFKA_TOPICS } from '../../../common/constants/kafka.topics';

describe('OutboxWorker (Transactional Outbox Publisher)', () => {
  let worker: OutboxWorker;

  const mockOutboxService = {
    findPendingEvents: jest.fn<() => Promise<OutboxEvent[]>>(),
    markAsPublished: jest.fn<() => Promise<void>>(),
    markAsFailed: jest.fn<() => Promise<void>>(),
  } as any;

  const mockKafkaProducerService = {
    publish: jest.fn<() => Promise<any>>(),
  } as any;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  } as any;

  beforeEach(() => {
    worker = new OutboxWorker(
      mockOutboxService,
      mockKafkaProducerService,
      mockConfigService,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    worker.onModuleDestroy();
  });

  it('should publish pending events using aggregateId as partition key and mark published', async () => {
    const mockEvents: OutboxEvent[] = [
      {
        id: 'evt-1',
        aggregateType: 'ORDER',
        aggregateId: 'ord-123',
        eventType: 'OrderCreated',
        payload: {
          topic: KAFKA_TOPICS.ORDER_CREATED,
          orderId: 'ord-123',
          amount: 500000,
        },
        status: OutboxStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      },
    ];

    mockOutboxService.findPendingEvents.mockResolvedValue(mockEvents);
    mockKafkaProducerService.publish.mockResolvedValue([]);
    mockOutboxService.markAsPublished.mockResolvedValue();

    const count = await worker.pollAndPublish();

    expect(count).toBe(1);
    expect(mockKafkaProducerService.publish).toHaveBeenCalledWith(
      KAFKA_TOPICS.ORDER_CREATED,
      'ord-123', // Aggregate ID used as partition key
      mockEvents[0].payload,
      expect.objectContaining({
        eventId: 'evt-1',
        aggregateId: 'ord-123',
      }),
    );
    expect(mockOutboxService.markAsPublished).toHaveBeenCalledWith('evt-1');
  });

  it('should call markAsFailed when Kafka publish fails', async () => {
    const mockEvents: OutboxEvent[] = [
      {
        id: 'evt-failed',
        aggregateType: 'ORDER',
        aggregateId: 'ord-err',
        eventType: 'OrderCreated',
        payload: {
          orderId: 'ord-err',
        },
        status: OutboxStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      },
    ];

    mockOutboxService.findPendingEvents.mockResolvedValue(mockEvents);
    mockKafkaProducerService.publish.mockRejectedValue(
      new Error('Broker disconnected'),
    );
    mockOutboxService.markAsFailed.mockResolvedValue();

    const count = await worker.pollAndPublish();

    expect(count).toBe(0);
    expect(mockOutboxService.markAsFailed).toHaveBeenCalledWith(
      'evt-failed',
      'Broker disconnected',
    );
  });
});

