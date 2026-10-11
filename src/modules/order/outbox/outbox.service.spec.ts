import { jest } from '@jest/globals';
import { OutboxService } from './outbox.service';
import { OutboxEvent, OutboxStatus } from '../entities/outbox-event.entity';

describe('OutboxService (Transactional Outbox Pattern)', () => {
  let service: OutboxService;

  const mockOutboxRepo = {
    find: jest.fn<() => Promise<OutboxEvent[]>>(),
    update: jest.fn<() => Promise<any>>(),
    findOneBy: jest.fn<() => Promise<OutboxEvent | null>>(),
  } as any;

  beforeEach(() => {
    service = new OutboxService(mockOutboxRepo);
    jest.clearAllMocks();
  });

  it('should find pending events ordered by creation date', async () => {
    const mockEvents: OutboxEvent[] = [
      {
        id: 'evt-1',
        aggregateType: 'ORDER',
        aggregateId: 'ord-1',
        eventType: 'OrderCreated',
        payload: {},
        status: OutboxStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      },
    ];

    mockOutboxRepo.find.mockResolvedValue(mockEvents);

    const result = await service.findPendingEvents(10, 5);
    expect(result).toEqual(mockEvents);
    expect(mockOutboxRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: OutboxStatus.PENDING,
        }),
        take: 10,
      }),
    );
  });

  it('should mark an event as PUBLISHED', async () => {
    mockOutboxRepo.update.mockResolvedValue({ affected: 1 });

    await service.markAsPublished('evt-1');

    expect(mockOutboxRepo.update).toHaveBeenCalledWith(
      'evt-1',
      expect.objectContaining({
        status: OutboxStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      }),
    );
  });

  it('should increment retryCount and remain PENDING if below maxRetries', async () => {
    const existingEvent: OutboxEvent = {
      id: 'evt-1',
      aggregateType: 'ORDER',
      aggregateId: 'ord-1',
      eventType: 'OrderCreated',
      payload: {},
      status: OutboxStatus.PENDING,
      retryCount: 1,
      createdAt: new Date(),
    };

    mockOutboxRepo.findOneBy.mockResolvedValue(existingEvent);
    mockOutboxRepo.update.mockResolvedValue({ affected: 1 });

    await service.markAsFailed('evt-1', 'Kafka timeout', 5);

    expect(mockOutboxRepo.update).toHaveBeenCalledWith('evt-1', {
      retryCount: 2,
      status: OutboxStatus.PENDING,
    });
  });

  it('should mark status as FAILED when retryCount reaches maxRetries', async () => {
    const existingEvent: OutboxEvent = {
      id: 'evt-1',
      aggregateType: 'ORDER',
      aggregateId: 'ord-1',
      eventType: 'OrderCreated',
      payload: {},
      status: OutboxStatus.PENDING,
      retryCount: 4,
      createdAt: new Date(),
    };

    mockOutboxRepo.findOneBy.mockResolvedValue(existingEvent);
    mockOutboxRepo.update.mockResolvedValue({ affected: 1 });

    await service.markAsFailed('evt-1', 'Kafka permanent failure', 5);

    expect(mockOutboxRepo.update).toHaveBeenCalledWith('evt-1', {
      retryCount: 5,
      status: OutboxStatus.FAILED,
    });
  });
});

