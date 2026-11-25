import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryTransactionType1795610000000 implements MigrationInterface {
  name = 'InventoryTransactionType1795610000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `inventory_transactions` MODIFY `TransactionType` ENUM('ADD','DEDUCT','IN','OUT') NOT NULL",
    );
    await queryRunner.query(
      "UPDATE `inventory_transactions` SET `TransactionType` = 'IN' WHERE `TransactionType` = 'ADD'",
    );
    await queryRunner.query(
      "UPDATE `inventory_transactions` SET `TransactionType` = 'OUT' WHERE `TransactionType` = 'DEDUCT'",
    );
    await queryRunner.query(
      "ALTER TABLE `inventory_transactions` MODIFY `TransactionType` ENUM('IN','OUT') NOT NULL",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `inventory_transactions` MODIFY `TransactionType` ENUM('IN','OUT','ADD','DEDUCT') NOT NULL",
    );
    await queryRunner.query(
      "UPDATE `inventory_transactions` SET `TransactionType` = 'ADD' WHERE `TransactionType` = 'IN'",
    );
    await queryRunner.query(
      "UPDATE `inventory_transactions` SET `TransactionType` = 'DEDUCT' WHERE `TransactionType` = 'OUT'",
    );
    await queryRunner.query(
      "ALTER TABLE `inventory_transactions` MODIFY `TransactionType` ENUM('ADD','DEDUCT') NOT NULL",
    );
  }
}
