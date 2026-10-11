import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryColumn({ name: 'message_id', type: 'varchar', length: 255 })
  messageId: string;

  @PrimaryColumn({ name: 'consumer_group', type: 'varchar', length: 100 })
  consumerGroup: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;
}

