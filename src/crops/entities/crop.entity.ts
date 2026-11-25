import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { FarmActivity } from '../../farm-activities/entities/farm-activity.entity';
import type { Harvest } from '../../harvests/entities/harvest.entity';
import type { User } from '../../users/entities/user.entity';
import { CropStatus } from './crop-status.enum';

@Entity({ name: 'crops' })
@Index('IDX_crops_UserID', ['userId'])
export class Crop {
  @PrimaryGeneratedColumn({ name: 'CropID', type: 'int', unsigned: true })
  cropId!: number;

  @Column({ name: 'CropName', type: 'varchar', length: 100 })
  cropName!: string;

  @Column({ name: 'CropType', type: 'varchar', length: 100 })
  cropType!: string;

  @Column({ name: 'PlantingDate', type: 'date' })
  plantingDate!: string;

  @Column({
    name: 'ExpectedHarvestDate',
    type: 'date',
    nullable: true,
  })
  expectedHarvestDate!: string | null;

  @Column({
    name: 'CropStatus',
    type: 'enum',
    enum: CropStatus,
    default: CropStatus.Planned,
  })
  cropStatus!: CropStatus;

  @Column({ name: 'UserID', type: 'int', unsigned: true })
  userId!: number;

  @ManyToOne('User', 'crops', {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'UserID',
    referencedColumnName: 'userId',
    foreignKeyConstraintName: 'FK_crops_users_UserID',
  })
  user!: Relation<User>;

  @OneToMany('FarmActivity', 'crop')
  farmActivities!: Relation<FarmActivity[]>;

  @OneToMany('Harvest', 'crop')
  harvests!: Relation<Harvest[]>;
}
