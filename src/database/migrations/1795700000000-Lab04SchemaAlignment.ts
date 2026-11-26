import type { MigrationInterface, QueryRunner } from 'typeorm';

const MAX_SIGNED_INT = 2_147_483_647;
const MAX_DECIMAL_10_2 = 99_999_999.99;

const preflightSql = `
SELECT
  (SELECT COUNT(*) FROM users WHERE CHAR_LENGTH(FullName) > 100) AS long_full_names,
  (SELECT COUNT(*) FROM users WHERE CHAR_LENGTH(Email) > 100) AS long_emails,
  (SELECT COUNT(*) FROM users WHERE UserID > ${MAX_SIGNED_INT}) AS large_user_ids,
  (SELECT COUNT(*) FROM crops WHERE CHAR_LENGTH(CropType) > 50) AS long_crop_types,
  (SELECT COUNT(*) FROM crops WHERE CropID > ${MAX_SIGNED_INT} OR UserID > ${MAX_SIGNED_INT}) AS large_crop_ids,
  (SELECT COUNT(*) FROM farm_activities WHERE CHAR_LENGTH(ActivityName) > 100) AS long_activity_names,
  (SELECT COUNT(*) FROM farm_activities WHERE ActivityID > ${MAX_SIGNED_INT} OR CropID > ${MAX_SIGNED_INT}) AS large_activity_ids,
  (SELECT COUNT(*) FROM inventory WHERE CHAR_LENGTH(ItemName) > 100 OR CHAR_LENGTH(ItemType) > 50 OR CHAR_LENGTH(Unit) > 20) AS long_inventory_text,
  (SELECT COUNT(*) FROM inventory WHERE InventoryID > ${MAX_SIGNED_INT}) AS large_inventory_ids,
  (SELECT COUNT(*) FROM inventory WHERE Quantity < 0 OR Quantity > ${MAX_DECIMAL_10_2} OR Quantity <> ROUND(Quantity, 2)) AS incompatible_inventory_quantities,
  (SELECT COUNT(*) FROM inventory WHERE ReorderLevel < 0 OR ReorderLevel > ${MAX_DECIMAL_10_2} OR ReorderLevel <> ROUND(ReorderLevel, 2)) AS incompatible_reorder_levels,
  (SELECT COUNT(*) FROM inventory_transactions WHERE TransactionID > ${MAX_SIGNED_INT} OR InventoryID > ${MAX_SIGNED_INT} OR UserID > ${MAX_SIGNED_INT}) AS large_transaction_ids,
  (SELECT COUNT(*) FROM inventory_transactions WHERE Quantity < 0 OR Quantity > ${MAX_DECIMAL_10_2} OR Quantity <> ROUND(Quantity, 2)) AS incompatible_transaction_quantities,
  (SELECT COUNT(*) FROM harvests WHERE CHAR_LENGTH(Unit) > 20) AS long_harvest_units,
  (SELECT COUNT(*) FROM harvests WHERE HarvestID > ${MAX_SIGNED_INT} OR CropID > ${MAX_SIGNED_INT}) AS large_harvest_ids,
  (SELECT COUNT(*) FROM harvests WHERE QuantityHarvested < 0 OR QuantityHarvested > ${MAX_DECIMAL_10_2} OR QuantityHarvested <> ROUND(QuantityHarvested, 2)) AS incompatible_harvest_quantities
`;

const checks: Array<[string, string]> = [
  ['Users', 'CHK_Users_Role'],
  ['Crops', 'CHK_Crops_CropStatus'],
  ['Inventory', 'CHK_Inventory_Quantity'],
  ['Inventory', 'CHK_Inventory_ReorderLevel'],
  ['InventoryTransactions', 'CHK_InventoryTransactions_TransactionType'],
  ['InventoryTransactions', 'CHK_InventoryTransactions_Quantity'],
  ['Harvests', 'CHK_Harvests_QuantityHarvested'],
];

const incompatibleDataQueries: Record<
  string,
  { table: string; id: string; condition: string }
> = {
  long_full_names: {
    table: 'users',
    id: 'UserID',
    condition: 'CHAR_LENGTH(`FullName`) > 100',
  },
  long_emails: {
    table: 'users',
    id: 'UserID',
    condition: 'CHAR_LENGTH(`Email`) > 100',
  },
  large_user_ids: {
    table: 'users',
    id: 'UserID',
    condition: `\`UserID\` > ${MAX_SIGNED_INT}`,
  },
  long_crop_types: {
    table: 'crops',
    id: 'CropID',
    condition: 'CHAR_LENGTH(`CropType`) > 50',
  },
  large_crop_ids: {
    table: 'crops',
    id: 'CropID',
    condition: `\`CropID\` > ${MAX_SIGNED_INT} OR \`UserID\` > ${MAX_SIGNED_INT}`,
  },
  long_activity_names: {
    table: 'farm_activities',
    id: 'ActivityID',
    condition: 'CHAR_LENGTH(`ActivityName`) > 100',
  },
  large_activity_ids: {
    table: 'farm_activities',
    id: 'ActivityID',
    condition: `\`ActivityID\` > ${MAX_SIGNED_INT} OR \`CropID\` > ${MAX_SIGNED_INT}`,
  },
  long_inventory_text: {
    table: 'inventory',
    id: 'InventoryID',
    condition:
      'CHAR_LENGTH(`ItemName`) > 100 OR CHAR_LENGTH(`ItemType`) > 50 OR CHAR_LENGTH(`Unit`) > 20',
  },
  large_inventory_ids: {
    table: 'inventory',
    id: 'InventoryID',
    condition: `\`InventoryID\` > ${MAX_SIGNED_INT}`,
  },
  incompatible_inventory_quantities: {
    table: 'inventory',
    id: 'InventoryID',
    condition: `\`Quantity\` < 0 OR \`Quantity\` > ${MAX_DECIMAL_10_2} OR \`Quantity\` <> ROUND(\`Quantity\`, 2)`,
  },
  incompatible_reorder_levels: {
    table: 'inventory',
    id: 'InventoryID',
    condition: `\`ReorderLevel\` < 0 OR \`ReorderLevel\` > ${MAX_DECIMAL_10_2} OR \`ReorderLevel\` <> ROUND(\`ReorderLevel\`, 2)`,
  },
  large_transaction_ids: {
    table: 'inventory_transactions',
    id: 'TransactionID',
    condition: `\`TransactionID\` > ${MAX_SIGNED_INT} OR \`InventoryID\` > ${MAX_SIGNED_INT} OR \`UserID\` > ${MAX_SIGNED_INT}`,
  },
  incompatible_transaction_quantities: {
    table: 'inventory_transactions',
    id: 'TransactionID',
    condition: `\`Quantity\` < 0 OR \`Quantity\` > ${MAX_DECIMAL_10_2} OR \`Quantity\` <> ROUND(\`Quantity\`, 2)`,
  },
  long_harvest_units: {
    table: 'harvests',
    id: 'HarvestID',
    condition: 'CHAR_LENGTH(`Unit`) > 20',
  },
  large_harvest_ids: {
    table: 'harvests',
    id: 'HarvestID',
    condition: `\`HarvestID\` > ${MAX_SIGNED_INT} OR \`CropID\` > ${MAX_SIGNED_INT}`,
  },
  incompatible_harvest_quantities: {
    table: 'harvests',
    id: 'HarvestID',
    condition: `\`QuantityHarvested\` < 0 OR \`QuantityHarvested\` > ${MAX_DECIMAL_10_2} OR \`QuantityHarvested\` <> ROUND(\`QuantityHarvested\`, 2)`,
  },
};

export class Lab04SchemaAlignment1795700000000 implements MigrationInterface {
  name = 'Lab04SchemaAlignment1795700000000';
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.assertCheckConstraintSupport(queryRunner);
    await this.assertExpectedTablesAndNoRenameConflicts(queryRunner);
    await this.assertCompatibleData(queryRunner);

    for (const [table, key] of [
      ['crops', 'FK_crops_users_UserID'],
      ['farm_activities', 'FK_farm_activities_crops_CropID'],
      ['harvests', 'FK_harvests_crops_CropID'],
      [
        'inventory_transactions',
        'FK_inventory_transactions_inventory_InventoryID',
      ],
      ['inventory_transactions', 'FK_inventory_transactions_users_UserID'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${key}\``,
      );
    }

    await this.renameTables(queryRunner, [
      ['users', 'Users'],
      ['crops', 'Crops'],
      ['farm_activities', 'FarmActivities'],
      ['inventory', 'Inventory'],
      ['inventory_transactions', 'InventoryTransactions'],
      ['harvests', 'Harvests'],
    ]);

    await queryRunner.query(
      "ALTER TABLE `Users` MODIFY `UserID` INT NOT NULL AUTO_INCREMENT, MODIFY `FullName` VARCHAR(100) NOT NULL, MODIFY `Email` VARCHAR(100) NOT NULL, MODIFY `Role` VARCHAR(20) NOT NULL DEFAULT 'Farmer'",
    );
    await queryRunner.query(
      "UPDATE `Users` SET `Role` = 'Farmer' WHERE `Role` = 'User'",
    );
    await queryRunner.query(
      "ALTER TABLE `Users` ADD CONSTRAINT `CHK_Users_Role` CHECK (`Role` IN ('Farmer', 'Admin'))",
    );

    await queryRunner.query(
      "ALTER TABLE `Crops` MODIFY `CropID` INT NOT NULL AUTO_INCREMENT, MODIFY `CropType` VARCHAR(50) NOT NULL, MODIFY `CropStatus` VARCHAR(20) NOT NULL DEFAULT 'Planned', MODIFY `UserID` INT NOT NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `Crops` ADD CONSTRAINT `CHK_Crops_CropStatus` CHECK (`CropStatus` IN ('Planned', 'Growing', 'ReadyForHarvest', 'Harvested', 'Cancelled'))",
    );

    await queryRunner.query(
      'ALTER TABLE `FarmActivities` MODIFY `ActivityID` INT NOT NULL AUTO_INCREMENT, MODIFY `ActivityName` VARCHAR(100) NOT NULL, MODIFY `CropID` INT NOT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE `Inventory` MODIFY `InventoryID` INT NOT NULL AUTO_INCREMENT, MODIFY `ItemName` VARCHAR(100) NOT NULL, MODIFY `ItemType` VARCHAR(50) NOT NULL, MODIFY `Quantity` DECIMAL(10,2) NOT NULL DEFAULT 0, MODIFY `Unit` VARCHAR(20) NOT NULL, MODIFY `ReorderLevel` DECIMAL(10,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `Inventory` ADD CONSTRAINT `CHK_Inventory_Quantity` CHECK (`Quantity` >= 0), ADD CONSTRAINT `CHK_Inventory_ReorderLevel` CHECK (`ReorderLevel` >= 0)',
    );

    await queryRunner.query(
      "ALTER TABLE `InventoryTransactions` MODIFY `TransactionID` INT NOT NULL AUTO_INCREMENT, MODIFY `TransactionType` VARCHAR(20) NOT NULL, MODIFY `Quantity` DECIMAL(10,2) NOT NULL, MODIFY `TransactionDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY `InventoryID` INT NOT NULL, MODIFY `UserID` INT NOT NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `InventoryTransactions` ADD CONSTRAINT `CHK_InventoryTransactions_TransactionType` CHECK (`TransactionType` IN ('IN', 'OUT')), ADD CONSTRAINT `CHK_InventoryTransactions_Quantity` CHECK (`Quantity` >= 0)",
    );

    await queryRunner.query(
      'ALTER TABLE `Harvests` MODIFY `HarvestID` INT NOT NULL AUTO_INCREMENT, MODIFY `QuantityHarvested` DECIMAL(10,2) NOT NULL, MODIFY `Unit` VARCHAR(20) NOT NULL, MODIFY `CropID` INT NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `Harvests` ADD CONSTRAINT `CHK_Harvests_QuantityHarvested` CHECK (`QuantityHarvested` >= 0)',
    );

    await this.createForeignKeys(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, key] of checks) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP CHECK \`${key}\``,
      );
    }

    await this.dropForeignKeys(queryRunner);

    await queryRunner.query(
      "UPDATE `Users` SET `Role` = 'User' WHERE `Role` = 'Farmer'",
    );
    await queryRunner.query(
      "ALTER TABLE `Users` MODIFY `UserID` INT UNSIGNED NOT NULL AUTO_INCREMENT, MODIFY `FullName` VARCHAR(150) NOT NULL, MODIFY `Email` VARCHAR(254) NOT NULL, MODIFY `Role` ENUM('Admin', 'User') NOT NULL DEFAULT 'User'",
    );
    await queryRunner.query(
      "ALTER TABLE `Crops` MODIFY `CropID` INT UNSIGNED NOT NULL AUTO_INCREMENT, MODIFY `CropType` VARCHAR(100) NOT NULL, MODIFY `CropStatus` ENUM('Planned', 'Growing', 'ReadyForHarvest', 'Harvested', 'Cancelled') NOT NULL DEFAULT 'Planned', MODIFY `UserID` INT UNSIGNED NOT NULL",
    );
    await queryRunner.query(
      'ALTER TABLE `FarmActivities` MODIFY `ActivityID` INT UNSIGNED NOT NULL AUTO_INCREMENT, MODIFY `ActivityName` VARCHAR(150) NOT NULL, MODIFY `CropID` INT UNSIGNED NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `Inventory` MODIFY `InventoryID` INT UNSIGNED NOT NULL AUTO_INCREMENT, MODIFY `ItemName` VARCHAR(150) NOT NULL, MODIFY `ItemType` VARCHAR(100) NOT NULL, MODIFY `Quantity` DECIMAL(12,3) NOT NULL DEFAULT 0, MODIFY `Unit` VARCHAR(32) NOT NULL, MODIFY `ReorderLevel` DECIMAL(12,3) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      "ALTER TABLE `InventoryTransactions` MODIFY `TransactionID` INT UNSIGNED NOT NULL AUTO_INCREMENT, MODIFY `TransactionType` ENUM('IN', 'OUT') NOT NULL, MODIFY `Quantity` DECIMAL(12,3) NOT NULL, MODIFY `TransactionDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY `InventoryID` INT UNSIGNED NOT NULL, MODIFY `UserID` INT UNSIGNED NOT NULL",
    );
    await queryRunner.query(
      'ALTER TABLE `Harvests` MODIFY `HarvestID` INT UNSIGNED NOT NULL AUTO_INCREMENT, MODIFY `QuantityHarvested` DECIMAL(12,3) NOT NULL, MODIFY `Unit` VARCHAR(32) NOT NULL, MODIFY `CropID` INT UNSIGNED NOT NULL',
    );

    await this.renameTables(queryRunner, [
      ['Users', 'users'],
      ['Crops', 'crops'],
      ['FarmActivities', 'farm_activities'],
      ['Inventory', 'inventory'],
      ['InventoryTransactions', 'inventory_transactions'],
      ['Harvests', 'harvests'],
    ]);
    await this.createForeignKeys(queryRunner, true);
  }

  private async assertExpectedTablesAndNoRenameConflicts(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
    )) as { TABLE_NAME: string }[];
    const names = new Set(rows.map(({ TABLE_NAME }) => TABLE_NAME));
    const pairs = [
      ['users', 'Users'],
      ['crops', 'Crops'],
      ['farm_activities', 'FarmActivities'],
      ['inventory', 'Inventory'],
      ['inventory_transactions', 'InventoryTransactions'],
      ['harvests', 'Harvests'],
    ];
    const missing = pairs
      .filter(
        ([legacy]) =>
          ![...names].some(
            (name) => name.toLowerCase() === legacy.toLowerCase(),
          ),
      )
      .map(([legacy]) => legacy);
    if (missing.length) {
      throw new Error(
        `Lab04 schema alignment expected the existing project tables but could not find: ${missing.join(', ')}. No tables were changed.`,
      );
    }

    const conflicts = pairs
      .filter(([legacy, target]) =>
        [...names].some(
          (name) =>
            name.toLowerCase() === target.toLowerCase() && name !== legacy,
        ),
      )
      .map(([, target]) => target);
    const temporaryNames = pairs.map(([legacy]) =>
      this.temporaryTableName(legacy),
    );
    const occupiedTemporaryNames = temporaryNames.filter((temporary) =>
      [...names].some(
        (name) => name.toLowerCase() === temporary.toLowerCase(),
      ),
    );
    if (conflicts.length || occupiedTemporaryNames.length) {
      throw new Error(
        `Lab04 schema alignment found table-name conflicts: ${[...conflicts, ...occupiedTemporaryNames].join(', ')}. No tables were changed.`,
      );
    }
  }

  private async assertCheckConstraintSupport(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const rows = (await queryRunner.query('SELECT VERSION() AS version')) as {
      version: string;
    }[];
    const version = rows[0]?.version ?? '';
    const isMariaDb = /mariadb/i.test(version);
    const parsed = isMariaDb
      ? version.match(/(\d+)\.(\d+)\.(\d+)-MariaDB/i) ??
        version.match(/(\d+)\.(\d+)\.(\d+)/)
      : version.match(/(\d+)\.(\d+)\.(\d+)/);
    const numbers = parsed?.slice(1).map(Number);
    const supported = numbers
      ? isMariaDb
        ? numbers[0] > 10 ||
          (numbers[0] === 10 &&
            (numbers[1] > 2 || (numbers[1] === 2 && numbers[2] >= 1)))
        : numbers[0] > 8 ||
          (numbers[0] === 8 &&
            (numbers[1] > 0 || (numbers[1] === 0 && numbers[2] >= 16)))
      : false;
    if (!supported) {
      throw new Error(
        `Lab04 schema alignment requires enforced SQL CHECK constraints; unsupported or unrecognized server version: ${version || 'unknown'}.`,
      );
    }
  }

  private async assertCompatibleData(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(preflightSql)) as Record<
      string,
      number | string
    >[];
    const incompatible = Object.entries(rows[0] ?? {}).filter(
      ([, count]) => Number(count) > 0,
    );
    if (incompatible.length) {
      const details = await Promise.all(
        incompatible.map(async ([field, count]) => {
          const query = incompatibleDataQueries[field];
          const rowIds = (await queryRunner.query(
            `SELECT \`${query.id}\` AS id FROM \`${query.table}\` WHERE ${query.condition} ORDER BY \`${query.id}\` LIMIT 10`,
          )) as { id: number }[];
          const ids = rowIds.map(({ id }) => id).join(', ');
          const more = Number(count) > rowIds.length ? ', and more' : '';
          return `${field}: ${count} row(s), IDs ${ids || 'unavailable'}${more}`;
        }),
      );
      throw new Error(
        `Lab04 schema alignment stopped before changing the database because existing data does not fit the target schema (${details.join('; ')}). Shorten or correct those rows explicitly, then retry; no rows were truncated or rounded.`,
      );
    }
  }

  private async renameTables(
    queryRunner: QueryRunner,
    pairs: Array<[string, string]>,
  ): Promise<void> {
    for (const [current, target] of pairs) {
      const temporary = this.temporaryTableName(current);
      await queryRunner.query(
        `RENAME TABLE \`${current}\` TO \`${temporary}\``,
      );
      await queryRunner.query(
        `RENAME TABLE \`${temporary}\` TO \`${target}\``,
      );
    }
  }

  private temporaryTableName(table: string): string {
    return `__cw_lab04_${table.replaceAll('_', '').toLowerCase()}_tmp`;
  }

  private async dropForeignKeys(queryRunner: QueryRunner): Promise<void> {
    for (const [table, key] of [
      ['Crops', 'FK_crops_users_UserID'],
      ['FarmActivities', 'FK_farm_activities_crops_CropID'],
      ['Harvests', 'FK_harvests_crops_CropID'],
      [
        'InventoryTransactions',
        'FK_inventory_transactions_inventory_InventoryID',
      ],
      ['InventoryTransactions', 'FK_inventory_transactions_users_UserID'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${key}\``,
      );
    }
  }

  private async createForeignKeys(
    queryRunner: QueryRunner,
    legacyNames = false,
  ): Promise<void> {
    const users = legacyNames ? 'users' : 'Users';
    const crops = legacyNames ? 'crops' : 'Crops';
    const activities = legacyNames ? 'farm_activities' : 'FarmActivities';
    const inventory = legacyNames ? 'inventory' : 'Inventory';
    const transactions = legacyNames
      ? 'inventory_transactions'
      : 'InventoryTransactions';
    const harvests = legacyNames ? 'harvests' : 'Harvests';
    await queryRunner.query(
      `ALTER TABLE \`${crops}\` ADD CONSTRAINT \`FK_crops_users_UserID\` FOREIGN KEY (\`UserID\`) REFERENCES \`${users}\` (\`UserID\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${activities}\` ADD CONSTRAINT \`FK_farm_activities_crops_CropID\` FOREIGN KEY (\`CropID\`) REFERENCES \`${crops}\` (\`CropID\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${harvests}\` ADD CONSTRAINT \`FK_harvests_crops_CropID\` FOREIGN KEY (\`CropID\`) REFERENCES \`${crops}\` (\`CropID\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${transactions}\` ADD CONSTRAINT \`FK_inventory_transactions_inventory_InventoryID\` FOREIGN KEY (\`InventoryID\`) REFERENCES \`${inventory}\` (\`InventoryID\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${transactions}\` ADD CONSTRAINT \`FK_inventory_transactions_users_UserID\` FOREIGN KEY (\`UserID\`) REFERENCES \`${users}\` (\`UserID\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
  }
}
