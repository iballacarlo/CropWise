import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsUsDate } from '../../common/date-format';

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

  @IsUsDate()
  activityDate!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
