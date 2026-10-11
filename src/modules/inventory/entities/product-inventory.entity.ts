import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('products_inventory')
export class ProductInventory {
  @PrimaryGeneratedColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  price: number;

  @Column({ name: 'total_stock', type: 'int', default: 0 })
  totalStock: number;

  @Column({ name: 'reserved_stock', type: 'int', default: 0 })
  reservedStock: number;

  @Column({ name: 'available_stock', type: 'int', default: 0 })
  availableStock: number;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

