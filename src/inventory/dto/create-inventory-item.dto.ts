import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  itemName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/\S/)
  itemType!: string;

  @IsString()
  @MaxLength(20)
  @Matches(/\S/)
  unit!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  reorderLevel?: number;
}
