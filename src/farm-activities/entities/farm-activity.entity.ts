import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Crop } from '../../crops/entities/crop.entity';

@Entity({ name: 'farm_activities' })
@Index('IDX_farm_activities_CropID', ['cropId'])
export class FarmActivity {
  @PrimaryGeneratedColumn({ name: 'ActivityID', type: 'int', unsigned: true })
  activityId!: number;

  @Column({ name: 'ActivityName', type: 'varchar', length: 150 })
  activityName!: string;

  @Column({ name: 'ActivityDate', type: 'date' })
  activityDate!: string;

  @Column({ name: 'Notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'CropID', type: 'int', unsigned: true })
  cropId!: number;

  @ManyToOne('Crop', 'farmActivities', {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'CropID',
    referencedColumnName: 'cropId',
    foreignKeyConstraintName: 'FK_farm_activities_crops_CropID',
  })
  crop!: Relation<Crop>;
}
