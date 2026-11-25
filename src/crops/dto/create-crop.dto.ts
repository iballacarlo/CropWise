import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
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

  @IsDateString({ strict: true })
  plantingDate!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  expectedHarvestDate?: string | null;

  @IsOptional()
  @IsEnum(CropStatus)
  cropStatus?: CropStatus;
}
