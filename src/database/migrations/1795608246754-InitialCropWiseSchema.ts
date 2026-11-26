import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { CropStatus } from '../../crops/entities/crop-status.enum';
import { InventoryTransactionType } from '../../inventory-transactions/entities/inventory-transaction-type.enum';

const generatedId = (name: string) => ({
  name,
  type: 'int',
  unsigned: true,
  isPrimary: true,
  isGenerated: true,
  generationStrategy: 'increment' as const,
});

const foreignKey = (
  name: string,
  columnName: string,
  referencedTableName: string,
) =>
  new TableForeignKey({
    name,
    columnNames: [columnName],
    referencedTableName,
    referencedColumnNames: [
      referencedTableName === 'users'
        ? 'UserID'
        : referencedTableName === 'crops'
          ? 'CropID'
          : 'InventoryID',
    ],
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

const index = (name: string, columnName: string) =>
  new TableIndex({ name, columnNames: [columnName] });

export class InitialCropWiseSchema1795608246754 implements MigrationInterface {
  name = 'InitialCropWiseSchema1795608246754';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      new Table({
        name: 'users',
        columns: [
          generatedId('UserID'),
          { name: 'FullName', type: 'varchar', length: '150' },
          { name: 'Email', type: 'varchar', length: '254' },
          { name: 'Password', type: 'varchar', length: '255' },
          {
            name: 'Role',
            type: 'enum',
            enum: ['Admin', 'User'],
            default: "'User'",
          },
        ],
        indices: [
          new TableIndex({
            name: 'UQ_users_Email',
            columnNames: ['Email'],
            isUnique: true,
          }),
        ],
      }),
      new Table({
        name: 'crops',
        columns: [
          generatedId('CropID'),
          { name: 'CropName', type: 'varchar', length: '100' },
          { name: 'CropType', type: 'varchar', length: '100' },
          { name: 'PlantingDate', type: 'date' },
          {
            name: 'ExpectedHarvestDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'CropStatus',
            type: 'enum',
            enum: Object.values(CropStatus),
            default: `'${CropStatus.Planned}'`,
          },
          { name: 'UserID', type: 'int', unsigned: true },
        ],
        indices: [index('IDX_crops_UserID', 'UserID')],
        foreignKeys: [foreignKey('FK_crops_users_UserID', 'UserID', 'users')],
      }),
      new Table({
        name: 'farm_activities',
        columns: [
          generatedId('ActivityID'),
          { name: 'ActivityName', type: 'varchar', length: '150' },
          { name: 'ActivityDate', type: 'date' },
          { name: 'Notes', type: 'text', isNullable: true },
          { name: 'CropID', type: 'int', unsigned: true },
        ],
        indices: [index('IDX_farm_activities_CropID', 'CropID')],
        foreignKeys: [
          foreignKey('FK_farm_activities_crops_CropID', 'CropID', 'crops'),
        ],
      }),
      new Table({
        name: 'inventory',
        columns: [
          generatedId('InventoryID'),
          { name: 'ItemName', type: 'varchar', length: '150' },
          { name: 'ItemType', type: 'varchar', length: '100' },
          {
            name: 'Quantity',
            type: 'decimal',
            precision: 12,
            scale: 3,
            default: '0',
          },
          { name: 'Unit', type: 'varchar', length: '32' },
          {
            name: 'ReorderLevel',
            type: 'decimal',
            precision: 12,
            scale: 3,
            default: '0',
          },
        ],
      }),
      new Table({
        name: 'inventory_transactions',
        columns: [
          generatedId('TransactionID'),
          {
            name: 'TransactionType',
            type: 'enum',
            enum: Object.values(InventoryTransactionType),
          },
          {
            name: 'Quantity',
            type: 'decimal',
            precision: 12,
            scale: 3,
          },
          {
            name: 'TransactionDate',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'InventoryID', type: 'int', unsigned: true },
          { name: 'UserID', type: 'int', unsigned: true },
        ],
        indices: [
          index('IDX_inventory_transactions_InventoryID', 'InventoryID'),
          index('IDX_inventory_transactions_UserID', 'UserID'),
        ],
        foreignKeys: [
          foreignKey(
            'FK_inventory_transactions_inventory_InventoryID',
            'InventoryID',
            'inventory',
          ),
          foreignKey(
            'FK_inventory_transactions_users_UserID',
            'UserID',
            'users',
          ),
        ],
      }),
      new Table({
        name: 'harvests',
        columns: [
          generatedId('HarvestID'),
          { name: 'HarvestDate', type: 'date' },
          {
            name: 'QuantityHarvested',
            type: 'decimal',
            precision: 12,
            scale: 3,
          },
          { name: 'Unit', type: 'varchar', length: '32' },
          { name: 'Notes', type: 'text', isNullable: true },
          { name: 'CropID', type: 'int', unsigned: true },
        ],
        indices: [index('IDX_harvests_CropID', 'CropID')],
        foreignKeys: [
          foreignKey('FK_harvests_crops_CropID', 'CropID', 'crops'),
        ],
      }),
    ];

    for (const table of tables) {
      await queryRunner.createTable(table);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of [
      'harvests',
      'inventory_transactions',
      'inventory',
      'farm_activities',
      'crops',
      'users',
    ]) {
      await queryRunner.dropTable(tableName);
    }
  }
}
