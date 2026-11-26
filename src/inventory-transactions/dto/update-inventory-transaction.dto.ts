import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { IsUsDateTime } from '../../common/date-format';
import { InventoryTransactionType } from '../entities/inventory-transaction-type.enum';

export class UpdateInventoryTransactionDto {
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  transactionType?: InventoryTransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  quantity?: number;

  @IsOptional()
  @IsUsDateTime()
  transactionDate?: string;
}
