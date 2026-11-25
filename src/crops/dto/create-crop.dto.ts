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

export class CreateCropDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  cropName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  cropType!: string;

  @IsUsDate()
  plantingDate!: string;

  @IsOptional()
  @IsUsDate()
  expectedHarvestDate?: string | null;

  @IsOptional()
  @IsEnum(CropStatus)
  cropStatus?: CropStatus;
}
