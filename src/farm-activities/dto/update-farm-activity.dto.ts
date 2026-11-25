import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateFarmActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Matches(/\S/)
  activityName?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  activityDate?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
