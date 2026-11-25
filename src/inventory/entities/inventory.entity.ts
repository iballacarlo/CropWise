import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { InventoryTransaction } from '../../inventory-transactions/entities/inventory-transaction.entity';

@Entity({ name: 'inventory' })
export class Inventory {
  @PrimaryGeneratedColumn({ name: 'InventoryID', type: 'int', unsigned: true })
  inventoryId!: number;

  @Column({ name: 'ItemName', type: 'varchar', length: 150 })
  itemName!: string;

  @Column({ name: 'ItemType', type: 'varchar', length: 100 })
  itemType!: string;

  @Column({
    name: 'Quantity',
    type: 'decimal',
    precision: 12,
    scale: 3,
    default: 0,
  })
  quantity!: string;

  @Column({ name: 'Unit', type: 'varchar', length: 32 })
  unit!: string;

  @Column({
    name: 'ReorderLevel',
    type: 'decimal',
    precision: 12,
    scale: 3,
    default: 0,
  })
  reorderLevel!: string;

  @OneToMany('InventoryTransaction', 'inventory')
  transactions!: Relation<InventoryTransaction[]>;
}
