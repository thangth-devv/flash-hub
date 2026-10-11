import { jest } from '@jest/globals';
import { Idempotent } from './idempotent.decorator';

class TestService {
  public redisService: any;
  public executionCount = 0;

  @Idempotent({ keyFrom: 'orderId', ttl: 60 })
  async processOrder(data: { orderId: string; amount: number }) {
    this.executionCount++;
    return `Processed order ${data.orderId}`;
  }
}

describe('Idempotent Decorator (Decorator Pattern)', () => {
  let service: TestService;
  let mockRedisService: any;

  beforeEach(() => {
    service = new TestService();
    mockRedisService = {
      setNx: jest.fn<() => Promise<boolean>>(),
    };
    service.redisService = mockRedisService;
  });

  it('should execute original method when message is received for the first time', async () => {
    mockRedisService.setNx.mockResolvedValue(true); // First time: key set successfully

    const result = await service.processOrder({
      orderId: 'ord-1',
      amount: 100000,
    });

    expect(result).toBe('Processed order ord-1');
    expect(service.executionCount).toBe(1);
    expect(mockRedisService.setNx).toHaveBeenCalledWith(
      'idem:processOrder:ord-1',
      'PROCESSED',
      60,
    );
  });

  it('should skip method execution when message is duplicate', async () => {
    mockRedisService.setNx.mockResolvedValue(false); // Duplicate: key already exists!

    const result = await service.processOrder({
      orderId: 'ord-1',
      amount: 100000,
    });

    expect(result).toBeUndefined(); // Short-circuited duplicate
    expect(service.executionCount).toBe(0); // Business logic was NOT executed
  });
});

