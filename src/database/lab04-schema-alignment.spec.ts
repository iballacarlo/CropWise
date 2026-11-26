import { jest } from '@jest/globals';
import type { QueryRunner } from 'typeorm';
import { Lab04SchemaAlignment1795700000000 } from './migrations/1795700000000-Lab04SchemaAlignment';

describe('Laboratory Activity 04 schema alignment migration', () => {
  it('checks the server and data before renaming tables or changing columns', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ version: '8.0.36' }] as never)
      .mockResolvedValueOnce(legacyTables() as never)
      .mockResolvedValueOnce([compatibleRows()] as never)
      .mockResolvedValue([] as never);

    await new Lab04SchemaAlignment1795700000000().up({
      query,
    } as unknown as QueryRunner);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toContain('SELECT VERSION()');
    expect(statements[1]).toContain('information_schema.TABLES');
    expect(statements[2]).toContain('CHAR_LENGTH(Email) > 100');
    expect(statements[3]).toContain('DROP FOREIGN KEY');
    expect(
      statements.some((sql) => sql.includes('RENAME TABLE `users` TO `__cw_lab04_users_tmp`')),
    ).toBe(true);
    expect(
      statements.some((sql) => sql.includes('RENAME TABLE `__cw_lab04_users_tmp` TO `Users`')),
    ).toBe(true);
    expect(statements.some((sql) => sql.includes('CHECK (`Role` IN'))).toBe(
      true,
    );
  });

  it('stops before DDL when existing values do not fit the target schema', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ version: '8.0.36' }] as never)
      .mockResolvedValueOnce(legacyTables() as never)
      .mockResolvedValueOnce([
        { ...compatibleRows(), incompatible_transaction_quantities: 2 },
      ] as never)
      .mockResolvedValueOnce([{ id: 42 }] as never);

    await expect(
      new Lab04SchemaAlignment1795700000000().up({
        query,
      } as unknown as QueryRunner),
    ).rejects.toThrow(/incompatible_transaction_quantities: 2 row\(s\)/);

    expect(query).toHaveBeenCalledTimes(4);
    expect(
      query.mock.calls.some(([sql]) => String(sql).includes('ALTER TABLE')),
    ).toBe(false);
    expect(
      query.mock.calls.some(([sql]) => String(sql).includes('RENAME TABLE')),
    ).toBe(false);
  });

  it('stops when the database does not enforce CHECK constraints', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ version: '8.0.15' }] as never);

    await expect(
      new Lab04SchemaAlignment1795700000000().up({
        query,
      } as unknown as QueryRunner),
    ).rejects.toThrow(/requires enforced SQL CHECK constraints/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

function compatibleRows(): Record<string, number> {
  return {
    long_full_names: 0,
    long_emails: 0,
    large_user_ids: 0,
    long_crop_types: 0,
    large_crop_ids: 0,
    long_activity_names: 0,
    large_activity_ids: 0,
    long_inventory_text: 0,
    large_inventory_ids: 0,
    incompatible_inventory_quantities: 0,
    incompatible_reorder_levels: 0,
    large_transaction_ids: 0,
    incompatible_transaction_quantities: 0,
    long_harvest_units: 0,
    large_harvest_ids: 0,
    incompatible_harvest_quantities: 0,
  };
}

function legacyTables(): { TABLE_NAME: string }[] {
  return [
    'users',
    'crops',
    'farm_activities',
    'inventory',
    'inventory_transactions',
    'harvests',
    'typeorm_migrations',
  ].map((TABLE_NAME) => ({ TABLE_NAME }));
}
