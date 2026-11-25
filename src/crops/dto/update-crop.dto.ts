import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { IsUsDate } from '../../common/date-format';
import { CropStatus } from '../entities/crop-status.enum';

export class UpdateCropDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  cropName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  cropType?: string;

  @IsOptional()
  @IsUsDate()
  plantingDate?: string;

  @IsOptional()
  @IsUsDate()
  expectedHarvestDate?: string | null;

  @IsOptional()
  @IsEnum(CropStatus)
  cropStatus?: CropStatus;
}
