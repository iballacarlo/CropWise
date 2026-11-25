import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { map } from 'rxjs';
import { formatResponseDates } from './date-format';

@Injectable()
export class DateFormatInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((response) => formatResponseDates(response)));
  }
}
