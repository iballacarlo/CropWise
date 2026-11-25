import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user';
import { Inventory } from '../inventory/entities/inventory.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryTransactionType as TxType } from './entities/inventory-transaction-type.enum';
import { InventoryTransactionsService } from './inventory-transactions.service';

describe('InventoryTransactionsService', () => {
  let service: InventoryTransactionsService;
  let item: Inventory;
  let transaction: InventoryTransaction;
  let itemRepository: { save: jest.Mock; createQueryBuilder: jest.Mock };
  let transactionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  const user: AuthUser = {
    userId: 17,
    fullName: 'Farm User',
    email: 'user@example.com',
    role: UserRole.User,
  };

  beforeEach(() => {
    item = {
      inventoryId: 3,
      itemName: 'Seeds',
      itemType: 'Supply',
      quantity: '4.000',
      unit: 'kg',
      reorderLevel: '1.000',
    } as Inventory;
    transaction = {
      transactionId: 9,
      transactionType: TxType.In,
      quantity: '5.000',
      transactionDate: new Date('2026-07-01T12:00:00.000Z'),
      inventoryId: 3,
      userId: user.userId,
    } as InventoryTransaction;
    itemRepository = {
      save: jest.fn(async (value) => value),
      createQueryBuilder: jest.fn(() => lockQuery(item)),
    };
    transactionRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      remove: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(async () => transaction),
      createQueryBuilder: jest.fn(() => lockQuery(transaction)),
    };
    const manager = {
      getRepository: (target: Function) =>
        target === Inventory ? itemRepository : transactionRepository,
    } as unknown as EntityManager;
    const dataSource = {
      transaction: (callback: (manager: EntityManager) => unknown) =>
        Promise.resolve(callback(manager)),
    } as unknown as DataSource;
    service = new InventoryTransactionsService(
      dataSource,
      transactionRepository as unknown as Repository<InventoryTransaction>,
    );
  });

  it('adds stock and records the authenticated user atomically', async () => {
    const created = await service.create(
      {
        inventoryId: 3,
        transactionType: TxType.In,
        quantity: 2.5,
      },
      user,
    );

    expect(itemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '6.500' }),
    );
    expect(transactionRepository.create.mock.calls[0][0]).toMatchObject({
      inventoryId: 3,
      userId: user.userId,
      transactionType: TxType.In,
      quantity: '2.500',
    });
    expect(created).toMatchObject({ userId: user.userId });
  });

  it('rejects an OUT transaction that exceeds available stock', async () => {
    item.quantity = '0.500';

    await expect(
      service.create(
        {
          inventoryId: 3,
          transactionType: TxType.Out,
          quantity: 1,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(itemRepository.save).not.toHaveBeenCalled();
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('reverses the prior movement before applying a transaction update', async () => {
    item.quantity = '7.500';

    await service.update(9, { quantity: 6 });

    expect(itemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '8.500' }),
    );
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '6.000' }),
    );
  });

  it('will not reverse an IN transaction if the stock has already been consumed', async () => {
    item.quantity = '2.000';

    await expect(service.remove(9)).rejects.toBeInstanceOf(ConflictException);
    expect(itemRepository.save).not.toHaveBeenCalled();
    expect(transactionRepository.remove).not.toHaveBeenCalled();
  });

  it('reverses an OUT transaction when it is deleted', async () => {
    transaction.transactionType = TxType.Out;
    transaction.quantity = '1.250';
    item.quantity = '2.000';

    await service.remove(9);

    expect(itemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '3.250' }),
    );
    expect(transactionRepository.remove).toHaveBeenCalledWith(transaction);
  });

  it('limits transaction history reads to the requesting user', async () => {
    transactionRepository.find.mockResolvedValue([] as never);
    await service.findAll(user);
    expect(transactionRepository.find.mock.calls[0][0]).toMatchObject({
      where: { userId: user.userId },
    });
  });
});

function lockQuery<T>(value: T) {
  const query = {
    setLock: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn().mockResolvedValue(value as never),
  };
  query.setLock.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}
