import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { IsUsDateTime } from '../../common/date-format';
import { InventoryTransactionType } from '../entities/inventory-transaction-type.enum';

export class CreateInventoryTransactionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inventoryId!: number;

  @IsEnum(InventoryTransactionType)
  transactionType!: InventoryTransactionType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  quantity!: number;

  @IsOptional()
  @IsUsDateTime()
  transactionDate?: string;
}
