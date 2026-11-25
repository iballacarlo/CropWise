import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { AuthUser } from '../auth/auth-user';
import { Inventory } from '../inventory/entities/inventory.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryTransactionType } from './entities/inventory-transaction-type.enum';

const MAX_STOCK_UNITS = 999_999_999_999n;

@Injectable()
export class InventoryTransactionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(InventoryTransaction)
    private readonly transactions: Repository<InventoryTransaction>,
  ) {}

  async create(
    input: CreateInventoryTransactionDto,
    actor: AuthUser,
  ): Promise<InventoryTransaction> {
    const quantity = toPositiveStockUnits(input.quantity);
    return this.dataSource.transaction(async (manager) => {
      const item = await lockInventory(manager, input.inventoryId);
      item.quantity = fromStockUnits(
        applyMovement(
          toStockUnits(item.quantity),
          input.transactionType,
          quantity,
        ),
      );
      await manager.getRepository(Inventory).save(item);

      const transaction = manager.getRepository(InventoryTransaction).create({
        inventoryId: item.inventoryId,
        userId: actor.userId,
        transactionType: input.transactionType,
        quantity: fromStockUnits(quantity),
        transactionDate: input.transactionDate
          ? new Date(input.transactionDate)
          : undefined,
      });
      return manager.getRepository(InventoryTransaction).save(transaction);
    });
  }

  findAll(actor: AuthUser): Promise<InventoryTransaction[]> {
    return this.transactions.find({
      where: actor.role === UserRole.Admin ? {} : { userId: actor.userId },
      order: { transactionId: 'ASC' },
    });
  }

  async findOne(
    transactionId: number,
    actor: AuthUser,
  ): Promise<InventoryTransaction> {
    const where =
      actor.role === UserRole.Admin
        ? { transactionId }
        : { transactionId, userId: actor.userId };
    const transaction = await this.transactions.findOne({ where });
    if (!transaction) {
      throw new NotFoundException('Inventory transaction not found.');
    }
    return transaction;
  }

  async update(
    transactionId: number,
    input: UpdateInventoryTransactionDto,
  ): Promise<InventoryTransaction> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one transaction field is required.',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const reference = await findTransaction(manager, transactionId);
      const item = await lockInventory(manager, reference.inventoryId);
      const transaction = await lockTransaction(manager, transactionId);
      if (transaction.inventoryId !== item.inventoryId) {
        throw new ConflictException(
          'The inventory transaction changed during update.',
        );
      }

      const previousQuantity = toStockUnits(transaction.quantity);
      const nextQuantity =
        input.quantity === undefined
          ? previousQuantity
          : toPositiveStockUnits(input.quantity);
      const nextType = input.transactionType ?? transaction.transactionType;
      const restoredStock = applyMovement(
        toStockUnits(item.quantity),
        transaction.transactionType,
        previousQuantity,
        true,
      );
      const nextStock = applyMovement(restoredStock, nextType, nextQuantity);

      item.quantity = fromStockUnits(nextStock);
      transaction.transactionType = nextType;
      transaction.quantity = fromStockUnits(nextQuantity);
      if (input.transactionDate !== undefined) {
        transaction.transactionDate = new Date(input.transactionDate);
      }

      await manager.getRepository(Inventory).save(item);
      return manager.getRepository(InventoryTransaction).save(transaction);
    });
  }

  async remove(transactionId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reference = await findTransaction(manager, transactionId);
      const item = await lockInventory(manager, reference.inventoryId);
      const transaction = await lockTransaction(manager, transactionId);
      if (transaction.inventoryId !== item.inventoryId) {
        throw new ConflictException(
          'The inventory transaction changed during deletion.',
        );
      }

      item.quantity = fromStockUnits(
        applyMovement(
          toStockUnits(item.quantity),
          transaction.transactionType,
          toStockUnits(transaction.quantity),
          true,
        ),
      );
      await manager.getRepository(Inventory).save(item);
      await manager.getRepository(InventoryTransaction).remove(transaction);
    });
  }
}

async function findTransaction(
  manager: EntityManager,
  transactionId: number,
): Promise<InventoryTransaction> {
  const transaction = await manager
    .getRepository(InventoryTransaction)
    .findOne({ where: { transactionId } });
  if (!transaction) {
    throw new NotFoundException('Inventory transaction not found.');
  }
  return transaction;
}

async function lockTransaction(
  manager: EntityManager,
  transactionId: number,
): Promise<InventoryTransaction> {
  const transaction = await manager
    .getRepository(InventoryTransaction)
    .createQueryBuilder('transaction')
    .setLock('pessimistic_write')
    .where('transaction.transactionId = :transactionId', { transactionId })
    .getOne();
  if (!transaction) {
    throw new NotFoundException('Inventory transaction not found.');
  }
  return transaction;
}

async function lockInventory(
  manager: EntityManager,
  inventoryId: number,
): Promise<Inventory> {
  const item = await manager
    .getRepository(Inventory)
    .createQueryBuilder('inventory')
    .setLock('pessimistic_write')
    .where('inventory.inventoryId = :inventoryId', { inventoryId })
    .getOne();
  if (!item) throw new NotFoundException('Inventory item not found.');
  return item;
}

function toStockUnits(quantity: string | number): bigint {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(String(quantity));
  if (!match) {
    throw new BadRequestException(
      'Quantity must be a nonnegative number with at most three decimal places.',
    );
  }
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(3, '0') || '0');
  const units = whole * 1000n + fraction;
  if (units > MAX_STOCK_UNITS) {
    throw new BadRequestException(
      'Quantity exceeds the supported inventory range.',
    );
  }
  return units;
}

function toPositiveStockUnits(quantity: string | number): bigint {
  const units = toStockUnits(quantity);
  if (units === 0n) {
    throw new BadRequestException(
      'Transaction quantity must be greater than zero.',
    );
  }
  return units;
}

function fromStockUnits(units: bigint): string {
  const whole = units / 1000n;
  const fraction = String(units % 1000n).padStart(3, '0');
  return `${whole}.${fraction}`;
}

function applyMovement(
  current: bigint,
  type: InventoryTransactionType,
  quantity: bigint,
  reverse = false,
): bigint {
  const increases =
    (type === InventoryTransactionType.In && !reverse) ||
    (type === InventoryTransactionType.Out && reverse);
  const result = increases ? current + quantity : current - quantity;
  if (result < 0n) {
    throw new ConflictException(
      'Insufficient stock for this inventory change.',
    );
  }
  if (result > MAX_STOCK_UNITS) {
    throw new ConflictException(
      'This inventory change exceeds the supported stock range.',
    );
  }
  return result;
}
