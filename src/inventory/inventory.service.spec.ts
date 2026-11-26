import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventory: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let transactionCount: jest.Mock;
  let lockedItem: Inventory | null;

  beforeEach(() => {
    lockedItem = {
      inventoryId: 3,
      itemName: 'Seeds',
      itemType: 'Supply',
      quantity: '0.00',
      unit: 'kg',
      reorderLevel: '2.00',
    } as Inventory;
    inventory = {
      create: jest.fn((item) => item),
      save: jest.fn(async (item) => item),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    transactionCount = jest.fn().mockResolvedValue(0 as never);

    const query = {
      setLock: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn(async () => lockedItem),
    };
    query.setLock.mockReturnValue(query);
    query.where.mockReturnValue(query);
    inventory.createQueryBuilder.mockReturnValue(query);
    const transactionRepository = { count: transactionCount };
    const manager = {
      getRepository: (target: Function) =>
        target === Inventory ? inventory : transactionRepository,
    } as unknown as EntityManager;
    const dataSource = {
      transaction: async (callback: (manager: EntityManager) => unknown) =>
        callback(manager),
    } as unknown as DataSource;
    service = new InventoryService(
      dataSource,
      inventory as unknown as Repository<Inventory>,
    );
  });

  it('creates new items with zero stock and a formatted reorder level', async () => {
    inventory.save.mockImplementation(async (item) => item);
    await service.create({
      itemName: 'Seeds',
      itemType: 'Supply',
      unit: 'kg',
      reorderLevel: 1.5,
    });
    expect(inventory.create.mock.calls[0][0]).toMatchObject({
      quantity: '0.00',
      reorderLevel: '1.50',
    });
  });

  it('identifies low stock by comparing quantity to reorder level', async () => {
    const query = {
      where: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([] as never),
    };
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    inventory.createQueryBuilder.mockReturnValue(query);

    await service.findLowStock();

    expect(query.where).toHaveBeenCalledWith(
      'inventory.quantity <= inventory.reorderLevel',
    );
  });

  it('prevents changing units after transaction history exists', async () => {
    transactionCount.mockResolvedValue(1 as never);

    await expect(service.update(3, { unit: 'bag' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(inventory.save).not.toHaveBeenCalled();
  });

  it('maps inventory items with transaction history to a conflict on delete', async () => {
    inventory.findOne.mockResolvedValue(lockedItem as never);
    inventory.remove.mockRejectedValue({
      code: 'ER_ROW_IS_REFERENCED_2',
    } as never);

    await expect(service.remove(3)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found for missing inventory items', async () => {
    inventory.findOne.mockResolvedValue(null as never);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps quantity out of inventory item updates', async () => {
    inventory.findOne.mockResolvedValue(lockedItem as never);
    inventory.save.mockImplementation(async (item) => item);
    await expect(
      service.update(3, { itemName: 'Updated seeds' }),
    ).resolves.toMatchObject({ itemName: 'Updated seeds' });
    expect(inventory.save.mock.calls[0][0]).toMatchObject({
      quantity: '0.00',
    });
  });
});
