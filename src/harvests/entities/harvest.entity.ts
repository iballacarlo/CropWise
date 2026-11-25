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

@Entity({ name: 'harvests' })
@Index('IDX_harvests_CropID', ['cropId'])
export class Harvest {
  @PrimaryGeneratedColumn({ name: 'HarvestID', type: 'int', unsigned: true })
  harvestId!: number;

  @Column({ name: 'HarvestDate', type: 'date' })
  harvestDate!: string;

  @Column({
    name: 'QuantityHarvested',
    type: 'decimal',
    precision: 12,
    scale: 3,
  })
  quantityHarvested!: string;

  @Column({ name: 'Unit', type: 'varchar', length: 32 })
  unit!: string;

  @Column({ name: 'Notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'CropID', type: 'int', unsigned: true })
  cropId!: number;

  @ManyToOne('Crop', 'harvests', {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'CropID',
    referencedColumnName: 'cropId',
    foreignKeyConstraintName: 'FK_harvests_crops_CropID',
  })
  crop!: Relation<Crop>;
}
