import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFarmActivityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cropId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Matches(/\S/)
  activityName!: string;

  @IsDateString({ strict: true })
  activityDate!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
