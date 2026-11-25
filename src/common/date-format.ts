import { registerDecorator } from 'class-validator';
import type { ValidationOptions } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

const DATE_FIELDS = new Set([
  'plantingDate',
  'expectedHarvestDate',
  'activityDate',
  'harvestDate',
]);

export function IsUsDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isUsDate',
      target: target.constructor,
      propertyName: String(propertyKey),
      options,
      validator: {
        validate: isUsDate,
      },
    });
  };
}

export function IsUsDateTime(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isUsDateTime',
      target: target.constructor,
      propertyName: String(propertyKey),
      options,
      validator: {
        validate: isUsDateTime,
      },
    });
  };
}

export function isUsDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || year < 1) return false;
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1];
}

export function isUsDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(
    value,
  );
  if (!match || !isUsDate(match[1])) return false;
  const [, , hours, minutes, seconds] = match;
  return (
    Number(hours) <= 23 && Number(minutes) <= 59 && Number(seconds) <= 59
  );
}

export function toDatabaseDate(value: string): string {
  if (!isUsDate(value)) {
    throw new BadRequestException('Date must use the valid MM/DD/YYYY format.');
  }
  const [month, day, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

export function toDatabaseDateTime(value: string): Date {
  if (!isUsDateTime(value)) {
    throw new BadRequestException(
      'Date time must use the valid MM/DD/YYYY HH:mm:ss format.',
    );
  }
  const [datePart, timePart] = value.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

export function formatDatabaseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

export function formatDatabaseDateTime(value: Date | string): string {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
      value,
    );
    if (!match) return value;
    const [, year, month, day, hours, minutes, seconds] = match;
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const year = String(value.getFullYear()).padStart(4, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatResponseDates<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => formatResponseDates(item)) as T;
  }
  if (!value || typeof value !== 'object' || value instanceof Date) return value;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || item === undefined) {
      result[key] = item;
    } else if (DATE_FIELDS.has(key) && typeof item === 'string') {
      result[key] = formatDatabaseDate(item);
    } else if (DATE_FIELDS.has(key) && item instanceof Date) {
      result[key] = formatDatabaseDateTime(item).slice(0, 10);
    } else if (
      key === 'transactionDate' &&
      (item instanceof Date || typeof item === 'string')
    ) {
      result[key] = formatDatabaseDateTime(item);
    } else {
      result[key] = formatResponseDates(item);
    }
  }
  return result as T;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
