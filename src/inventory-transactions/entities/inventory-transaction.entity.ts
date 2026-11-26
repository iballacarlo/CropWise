import {
  Column,
  Check,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Inventory } from '../../inventory/entities/inventory.entity';
import type { User } from '../../users/entities/user.entity';
import { InventoryTransactionType } from './inventory-transaction-type.enum';

@Entity({ name: 'inventory_transactions' })
@Check(
  'CHK_InventoryTransactions_TransactionType',
  '`TransactionType` IN (\'IN\', \'OUT\')',
)
@Check('CHK_InventoryTransactions_Quantity', '`Quantity` >= 0')
@Index('IDX_inventory_transactions_InventoryID', ['inventoryId'])
@Index('IDX_inventory_transactions_UserID', ['userId'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn({
    name: 'TransactionID',
    type: 'int',
  })
  transactionId!: number;

  @Column({
    name: 'TransactionType',
    type: 'varchar',
    length: 20,
  })
  transactionType!: InventoryTransactionType;

  @Column({
    name: 'Quantity',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  quantity!: string;

  @Column({
    name: 'TransactionDate',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  transactionDate!: Date;

  @Column({ name: 'InventoryID', type: 'int' })
  inventoryId!: number;

  @ManyToOne('Inventory', 'transactions', {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'InventoryID',
    referencedColumnName: 'inventoryId',
    foreignKeyConstraintName: 'FK_inventory_transactions_inventory_InventoryID',
  })
  inventory!: Relation<Inventory>;

  @Column({ name: 'UserID', type: 'int' })
  userId!: number;

  @ManyToOne('User', 'inventoryTransactions', {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'UserID',
    referencedColumnName: 'userId',
    foreignKeyConstraintName: 'FK_inventory_transactions_users_UserID',
  })
  user!: Relation<User>;
}
