import { jest } from '@jest/globals';
import { QueryRunner, Table } from 'typeorm';
import { InitialCropWiseSchema1795608246754 } from './migrations/1795608246754-InitialCropWiseSchema';

describe('initial CropWise schema migration', () => {
  it('creates the six tables, indexes and restrictive foreign keys in dependency order', async () => {
    const createdTables: Table[] = [];
    const queryRunner = {
      createTable: jest.fn(async (table: Table) => {
        createdTables.push(table);
      }),
    } as unknown as QueryRunner;

    await new InitialCropWiseSchema1795608246754().up(queryRunner);

    expect(createdTables.map((table) => table.name)).toEqual([
      'users',
      'crops',
      'farm_activities',
      'inventory',
      'inventory_transactions',
      'harvests',
    ]);
    const expectedColumns = [
      ['UserID', 'FullName', 'Email', 'Password', 'Role'],
      [
        'CropID',
        'CropName',
        'CropType',
        'PlantingDate',
        'ExpectedHarvestDate',
        'CropStatus',
        'UserID',
      ],
      ['ActivityID', 'ActivityName', 'ActivityDate', 'Notes', 'CropID'],
      [
        'InventoryID',
        'ItemName',
        'ItemType',
        'Quantity',
        'Unit',
        'ReorderLevel',
      ],
      [
        'TransactionID',
        'TransactionType',
        'Quantity',
        'TransactionDate',
        'InventoryID',
        'UserID',
      ],
      [
        'HarvestID',
        'HarvestDate',
        'QuantityHarvested',
        'Unit',
        'Notes',
        'CropID',
      ],
    ];
    expect(
      createdTables.map((table) => table.columns.map(({ name }) => name)),
    ).toEqual(expectedColumns);
    expect(createdTables[0].indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'UQ_users_Email', isUnique: true }),
      ]),
    );
    expect(createdTables[0].findColumnByName('Role')?.enum).toEqual([
      'Admin',
      'User',
    ]);
    expect(createdTables[1].findColumnByName('CropStatus')?.enum).toEqual([
      'Planned',
      'Growing',
      'ReadyForHarvest',
      'Harvested',
      'Cancelled',
    ]);

    const foreignKeys = createdTables.flatMap((table) => table.foreignKeys);
    expect(foreignKeys).toHaveLength(5);
    expect(foreignKeys.every((key) => key.onDelete === 'RESTRICT')).toBe(true);
    expect(foreignKeys.map((key) => key.referencedTableName)).toEqual([
      'users',
      'crops',
      'inventory',
      'users',
      'crops',
    ]);
  });

  it('drops tables in reverse dependency order', async () => {
    const dropTable = jest.fn(async (tableName: string) => tableName);
    const queryRunner = {
      dropTable,
    } as unknown as QueryRunner;

    await new InitialCropWiseSchema1795608246754().down(queryRunner);

    expect(dropTable.mock.calls.map(([name]) => name)).toEqual([
      'harvests',
      'inventory_transactions',
      'inventory',
      'farm_activities',
      'crops',
      'users',
    ]);
  });
});
