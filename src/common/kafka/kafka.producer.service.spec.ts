import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka.producer.service';

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'kafka.brokers') return ['localhost:29092'];
      if (key === 'kafka.clientId') return 'test-client';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaProducerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

