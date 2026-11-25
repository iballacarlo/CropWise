import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { InventoryTransactionType } from '../entities/inventory-transaction-type.enum';

export class UpdateInventoryTransactionDto {
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  transactionType?: InventoryTransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999.999)
  quantity?: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
