import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { Crop } from '../crops/entities/crop.entity';
import { CropStatus } from '../crops/entities/crop-status.enum';
import { FarmActivity } from '../farm-activities/entities/farm-activity.entity';
import { Harvest } from '../harvests/entities/harvest.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryTransaction } from '../inventory-transactions/entities/inventory-transaction.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { createDatabaseOptions } from './database-options';

describe('CropWise entity metadata', () => {
  const storage = getMetadataArgsStorage();

  it('maps all six entity classes to their intended tables and primary keys', () => {
    const expected = [
      [User, 'users', 'userId', 'UserID'],
      [Crop, 'crops', 'cropId', 'CropID'],
      [FarmActivity, 'farm_activities', 'activityId', 'ActivityID'],
      [Inventory, 'inventory', 'inventoryId', 'InventoryID'],
      [
        InventoryTransaction,
        'inventory_transactions',
        'transactionId',
        'TransactionID',
      ],
      [Harvest, 'harvests', 'harvestId', 'HarvestID'],
    ] as const;

    for (const [target, tableName, propertyName, columnName] of expected) {
      expect(
        storage.tables.find((table) => table.target === target)?.name,
      ).toBe(tableName);
      expect(
        storage.generations.find((column) => column.target === target)
          ?.propertyName,
      ).toBe(propertyName);
      expect(
        storage.columns.find(
          (column) =>
            column.target === target && column.propertyName === propertyName,
        )?.options.name,
      ).toBe(columnName);
    }
  });

  it('maps the required unique email, role and crop status values', () => {
    expect(
      storage.indices.find(
        (index) => index.target === User && index.name === 'UQ_users_Email',
      )?.unique,
    ).toBe(true);
    expect(UserRole).toEqual({ Admin: 'Admin', Farmer: 'Farmer' });
    expect(CropStatus).toEqual({
      Planned: 'Planned',
      Growing: 'Growing',
      ReadyForHarvest: 'ReadyForHarvest',
      Harvested: 'Harvested',
      Cancelled: 'Cancelled',
    });
    expect(
      storage.columns.find(
        (column) => column.target === User && column.propertyName === 'role',
      )?.options,
    ).toMatchObject({ type: 'varchar', length: 20 });
    expect(
      storage.columns.find(
        (column) => column.target === Crop && column.propertyName === 'cropStatus',
      )?.options,
    ).toMatchObject({ type: 'varchar', length: 20 });
    expect(
      storage.columns.find(
        (column) =>
          column.target === InventoryTransaction &&
          column.propertyName === 'transactionType',
      )?.options,
    ).toMatchObject({ type: 'varchar', length: 20 });
    expect(
      storage.checks.some(
        (check) => check.target === User && check.name === 'CHK_Users_Role',
      ),
    ).toBe(true);
    expect(
      storage.checks.some(
        (check) => check.target === Inventory && check.name === 'CHK_Inventory_Quantity',
      ),
    ).toBe(true);
  });

  it('declares the requested one-to-many and many-to-one relationships', () => {
    const relations = storage.relations;
    const hasRelation = (
      target: Function,
      propertyName: string,
      relationType: string,
    ) =>
      relations.some(
        (relation) =>
          relation.target === target &&
          relation.propertyName === propertyName &&
          relation.relationType === relationType,
      );

    expect(hasRelation(User, 'crops', 'one-to-many')).toBe(true);
    expect(hasRelation(Crop, 'user', 'many-to-one')).toBe(true);
    expect(hasRelation(Crop, 'farmActivities', 'one-to-many')).toBe(true);
    expect(hasRelation(FarmActivity, 'crop', 'many-to-one')).toBe(true);
    expect(hasRelation(Crop, 'harvests', 'one-to-many')).toBe(true);
    expect(hasRelation(Harvest, 'crop', 'many-to-one')).toBe(true);
    expect(hasRelation(Inventory, 'transactions', 'one-to-many')).toBe(true);
    expect(hasRelation(InventoryTransaction, 'inventory', 'many-to-one')).toBe(
      true,
    );
    expect(hasRelation(User, 'inventoryTransactions', 'one-to-many')).toBe(
      true,
    );
    expect(hasRelation(InventoryTransaction, 'user', 'many-to-one')).toBe(true);
  });

  it('builds TypeORM relation metadata with a single column per foreign key', async () => {
    const dataSource = new DataSource({
      ...createDatabaseOptions({
        DB_HOST: '127.0.0.1',
        DB_PORT: 3306,
        DB_USERNAME: 'test',
        DB_PASSWORD: 'test',
        DB_DATABASE: 'cropwise_db',
      }),
    });
    const buildMetadatas = (
      dataSource as unknown as { buildMetadatas: () => Promise<void> }
    ).buildMetadatas.bind(dataSource);

    await buildMetadatas();

    const cropMetadata = dataSource.entityMetadatas.find(
      (metadata) => metadata.target === Crop,
    );
    const transactionMetadata = dataSource.entityMetadatas.find(
      (metadata) => metadata.target === InventoryTransaction,
    );
    expect(
      cropMetadata?.columns.filter(
        (column) => column.databaseName === 'UserID',
      ),
    ).toHaveLength(1);
    expect(cropMetadata?.foreignKeys).toHaveLength(1);
    expect(
      transactionMetadata?.columns.filter(
        (column) =>
          column.databaseName === 'InventoryID' ||
          column.databaseName === 'UserID',
      ),
    ).toHaveLength(2);
    expect(transactionMetadata?.foreignKeys).toHaveLength(2);
    expect(
      dataSource.entityMetadatas.map((metadata) => metadata.tableName).sort(),
    ).toEqual([
      'crops',
      'farm_activities',
      'harvests',
      'inventory',
      'inventory_transactions',
      'users',
    ]);
    expect(dataSource.migrations.map((migration) => migration.name)).toEqual([
      'InitialCropWiseSchema1795608246754',
      'InventoryTransactionType1795610000000',
      'Lab04SchemaAlignment1795700000000',
      'SnakeCaseTableNames1795800000000',
    ]);
  });
});
