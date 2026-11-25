import { BadRequestException } from '@nestjs/common';
import {
  formatDatabaseDate,
  formatDatabaseDateTime,
  isUsDate,
  isUsDateTime,
  toDatabaseDate,
  toDatabaseDateTime,
} from './date-format';

describe('date format helpers', () => {
  it('accepts valid calendar dates and leap days only', () => {
    expect(isUsDate('02/29/2024')).toBe(true);
    expect(isUsDate('02/29/2025')).toBe(false);
    expect(isUsDate('02/30/2026')).toBe(false);
    expect(isUsDate('2026-02-03')).toBe(false);
  });

  it('converts MM/DD/YYYY to a MySQL DATE string', () => {
    expect(toDatabaseDate('02/03/2026')).toBe('2026-02-03');
    expect(() => toDatabaseDate('02/30/2026')).toThrow(BadRequestException);
  });

  it('validates and converts a 24-hour date time without changing its wall clock', () => {
    expect(isUsDateTime('02/03/2026 16:07:08')).toBe(true);
    expect(isUsDateTime('02/03/2026 24:00:00')).toBe(false);
    expect(isUsDateTime('02/03/2026')).toBe(false);

    const date = toDatabaseDateTime('02/03/2026 16:07:08');
    expect(formatDatabaseDateTime(date)).toBe('02/03/2026 16:07:08');
    expect(() => toDatabaseDateTime('02/30/2026 16:07:08')).toThrow(
      BadRequestException,
    );
  });

  it('formats database DATE strings for API output', () => {
    expect(formatDatabaseDate('2026-02-03')).toBe('02/03/2026');
    expect(formatDatabaseDateTime('2026-02-03 04:05:06')).toBe(
      '02/03/2026 04:05:06',
    );
    expect(formatDatabaseDate('invalid')).toBe('invalid');
  });
});
