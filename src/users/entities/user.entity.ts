import {
  Column,
  Check,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Crop } from '../../crops/entities/crop.entity';
import type { InventoryTransaction } from '../../inventory-transactions/entities/inventory-transaction.entity';
import { UserRole } from './user-role.enum';

@Entity({ name: 'users' })
@Check('CHK_Users_Role', '`Role` IN (\'Farmer\', \'Admin\')')
@Index('UQ_users_Email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ name: 'UserID', type: 'int' })
  userId!: number;

  @Column({ name: 'FullName', type: 'varchar', length: 100 })
  fullName!: string;

  @Column({ name: 'Email', type: 'varchar', length: 100 })
  email!: string;

  @Column({ name: 'Password', type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({
    name: 'Role',
    type: 'varchar',
    length: 20,
    default: UserRole.Farmer,
  })
  role!: UserRole;

  @OneToMany('Crop', 'user')
  crops!: Relation<Crop[]>;

  @OneToMany('InventoryTransaction', 'user')
  inventoryTransactions!: Relation<InventoryTransaction[]>;
}
