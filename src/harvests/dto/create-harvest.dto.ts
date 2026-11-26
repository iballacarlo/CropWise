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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  quantityHarvested!: number;

  @IsString()
  @MaxLength(20)
  @Matches(/\S/)
  unit!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
