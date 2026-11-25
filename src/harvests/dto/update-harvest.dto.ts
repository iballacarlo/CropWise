import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateHarvestDto {
  @IsOptional()
  @IsDateString({ strict: true })
  harvestDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999.999)
  quantityHarvested?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/\S/)
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
