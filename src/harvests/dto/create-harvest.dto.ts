import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsUsDate } from '../../common/date-format';

export class CreateHarvestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cropId!: number;

  @IsUsDate()
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
