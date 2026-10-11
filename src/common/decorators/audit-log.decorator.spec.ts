import { AuditLog } from './audit-log.decorator';

class TestAuditService {
  @AuditLog('processPayment')
  async charge(amount: number) {
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }
    return `Charged ${amount}`;
  }
}

describe('AuditLog Decorator (Decorator Pattern)', () => {
  let service: TestAuditService;

  beforeEach(() => {
    service = new TestAuditService();
  });

  it('should log execution and return method result on success', async () => {
    const result = await service.charge(500);
    expect(result).toBe('Charged 500');
  });

  it('should rethrow error and log failure when method fails', async () => {
    await expect(service.charge(-10)).rejects.toThrow('Invalid amount');
  });
});

