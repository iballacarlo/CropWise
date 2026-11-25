import { jest } from '@jest/globals';
import type { QueryRunner } from 'typeorm';
import { InventoryTransactionType1795610000000 } from './migrations/1795610000000-InventoryTransactionType';

describe('inventory transaction type migration', () => {
  it('maps old values to IN/OUT without deleting transaction rows', async () => {
    const query = jest.fn(async (_sql: string) => undefined);
    const migration = new InventoryTransactionType1795610000000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "ALTER TABLE `inventory_transactions` MODIFY `TransactionType` ENUM('ADD','DEDUCT','IN','OUT') NOT NULL",
      "UPDATE `inventory_transactions` SET `TransactionType` = 'IN' WHERE `TransactionType` = 'ADD'",
      "UPDATE `inventory_transactions` SET `TransactionType` = 'OUT' WHERE `TransactionType` = 'DEDUCT'",
      "ALTER TABLE `inventory_transactions` MODIFY `TransactionType` ENUM('IN','OUT') NOT NULL",
    ]);
  });

  it('can restore the previous enum values', async () => {
    const query = jest.fn(async (_sql: string) => undefined);

    await new InventoryTransactionType1795610000000().down({
      query,
    } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[1][0]).toContain("= 'ADD' WHERE");
    expect(query.mock.calls[2][0]).toContain("= 'DEDUCT' WHERE");
  });
});
