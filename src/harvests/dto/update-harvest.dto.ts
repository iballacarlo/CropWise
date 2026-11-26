import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsUsDate } from '../../common/date-format';

export class UpdateHarvestDto {
  @IsOptional()
  @IsUsDate()
  harvestDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  quantityHarvested?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/\S/)
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
