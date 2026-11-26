import type { MigrationInterface, QueryRunner } from 'typeorm';

const alignedTableNames: Array<[string, string]> = [
  ['Users', 'users'],
  ['Crops', 'crops'],
  ['FarmActivities', 'farm_activities'],
  ['Inventory', 'inventory'],
  ['InventoryTransactions', 'inventory_transactions'],
  ['Harvests', 'harvests'],
];

export class SnakeCaseTableNames1795800000000 implements MigrationInterface {
  name = 'SnakeCaseTableNames1795800000000';
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.renameTables(queryRunner, alignedTableNames);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.renameTables(
      queryRunner,
      alignedTableNames.map(([legacy, snakeCase]) => [snakeCase, legacy]),
    );
  }

  private async renameTables(
    queryRunner: QueryRunner,
    pairs: Array<[string, string]>,
  ): Promise<void> {
    const names = await this.getTableNames(queryRunner);
    const planned = pairs.map(([from, to]) => {
      const source = names.find(
        (name) => name.toLowerCase() === from.toLowerCase(),
      );
      if (!source) {
        throw new Error(`Cannot rename database table ${from}: table not found.`);
      }

      const conflictingTarget = names.find(
        (name) =>
          name.toLowerCase() === to.toLowerCase() && name !== source,
      );
      if (conflictingTarget) {
        throw new Error(
          `Cannot rename database table ${source} to ${to}: target table already exists.`,
        );
      }

      return { source, target: to };
    });

    for (const { source, target } of planned) {
      if (source === target) continue;

      const temporary = `__cw_snake_${target.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      if (names.some((name) => name.toLowerCase() === temporary.toLowerCase())) {
        throw new Error(
          `Cannot rename database table ${source}: temporary table ${temporary} already exists.`,
        );
      }

      await queryRunner.query(
        `RENAME TABLE \`${source}\` TO \`${temporary}\``,
      );
      await queryRunner.query(
        `RENAME TABLE \`${temporary}\` TO \`${target}\``,
      );
    }
  }

  private async getTableNames(queryRunner: QueryRunner): Promise<string[]> {
    const rows = (await queryRunner.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = \'BASE TABLE\'',
    )) as Array<{ TABLE_NAME: string }>;
    return rows.map((row) => row.TABLE_NAME);
  }
}
