import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { InventoryTransactionType } from '../entities/inventory-transaction-type.enum';

export class CreateInventoryTransactionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inventoryId!: number;

  @IsEnum(InventoryTransactionType)
  transactionType!: InventoryTransactionType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999.999)
  quantity!: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
