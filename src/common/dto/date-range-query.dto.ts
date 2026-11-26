import { IsOptional } from 'class-validator';
import { IsUsDate } from '../date-format';

export class DateRangeQueryDto {
  @IsOptional()
  @IsUsDate()
  fromDate?: string;

  @IsOptional()
  @IsUsDate()
  toDate?: string;
}
