import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsUsDate } from '../../common/date-format';

export class UpdateFarmActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  activityName?: string;

  @IsOptional()
  @IsUsDate()
  activityDate?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
