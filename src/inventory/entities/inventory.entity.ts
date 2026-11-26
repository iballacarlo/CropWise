import {
  Check,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { InventoryTransaction } from '../../inventory-transactions/entities/inventory-transaction.entity';

@Entity({ name: 'inventory' })
@Check('CHK_Inventory_Quantity', '`Quantity` >= 0')
@Check('CHK_Inventory_ReorderLevel', '`ReorderLevel` >= 0')
export class Inventory {
  @PrimaryGeneratedColumn({ name: 'InventoryID', type: 'int' })
  inventoryId!: number;

  @Column({ name: 'ItemName', type: 'varchar', length: 100 })
  itemName!: string;

  @Column({ name: 'ItemType', type: 'varchar', length: 50 })
  itemType!: string;

  @Column({
    name: 'Quantity',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  quantity!: string;

  @Column({ name: 'Unit', type: 'varchar', length: 20 })
  unit!: string;

  @Column({
    name: 'ReorderLevel',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  reorderLevel!: string;

  @OneToMany('InventoryTransaction', 'inventory')
  transactions!: Relation<InventoryTransaction[]>;
}
