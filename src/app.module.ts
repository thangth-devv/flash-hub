import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import configuration from './config/configuration';
import { KafkaModule } from './common/kafka/kafka.module';
import { RedisModule } from './common/redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Order } from './modules/order/entities/order.entity';
import { OrderItem } from './modules/order/entities/order-item.entity';
import { OutboxEvent } from './modules/order/entities/outbox-event.entity';
import { ProductInventory } from './modules/inventory/entities/product-inventory.entity';
import { ProcessedMessage } from './common/entities/processed-message.entity';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // PostgreSQL TypeORM Setup
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [
          Order,
          OrderItem,
          OutboxEvent,
          ProductInventory,
          ProcessedMessage,
        ],
        synchronize: false,
        autoLoadEntities: true,
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),

    // Distributed Infrastructure
    KafkaModule,
    RedisModule,

    // Observability
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY || 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET || 'YOUR_APP_SECRET',
      serviceId: 'flashhub-engine',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
