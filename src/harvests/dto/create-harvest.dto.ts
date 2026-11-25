import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHarvestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cropId!: number;

  @IsDateString({ strict: true })
  harvestDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999.999)
  quantityHarvested!: number;

  @IsString()
  @MaxLength(32)
  @Matches(/\S/)
  unit!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
