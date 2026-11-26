import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { Inventory } from './entities/inventory.entity';
import { InventoryTransaction } from '../inventory-transactions/entities/inventory-transaction.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Inventory)
    private readonly inventory: Repository<Inventory>,
  ) {}

  async create(input: CreateInventoryItemDto): Promise<Inventory> {
    const item = this.inventory.create({
      itemName: input.itemName.trim(),
      itemType: input.itemType.trim(),
      unit: input.unit.trim(),
      reorderLevel: formatQuantity(input.reorderLevel ?? 0),
      quantity: '0.00',
    });
    return this.inventory.save(item);
  }

  findAll(): Promise<Inventory[]> {
    return this.inventory.find({ order: { inventoryId: 'ASC' } });
  }

  findLowStock(): Promise<Inventory[]> {
    return this.inventory
      .createQueryBuilder('inventory')
      .where('inventory.quantity <= inventory.reorderLevel')
      .orderBy('inventory.inventoryId', 'ASC')
      .getMany();
  }

  async findOne(inventoryId: number): Promise<Inventory> {
    const item = await this.inventory.findOne({ where: { inventoryId } });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return item;
  }

  async update(
    inventoryId: number,
    input: UpdateInventoryItemDto,
  ): Promise<Inventory> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one inventory field is required.',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);
      const item = await repository
        .createQueryBuilder('inventory')
        .setLock('pessimistic_write')
        .where('inventory.inventoryId = :inventoryId', { inventoryId })
        .getOne();
      if (!item) throw new NotFoundException('Inventory item not found.');

      if (input.unit !== undefined && input.unit.trim() !== item.unit) {
        const transactionCount = await manager
          .getRepository(InventoryTransaction)
          .count({ where: { inventoryId } });
        if (transactionCount > 0) {
          throw new ConflictException(
            'The unit cannot be changed after inventory transactions exist.',
          );
        }
        item.unit = input.unit.trim();
      }
      if (input.itemName !== undefined) item.itemName = input.itemName.trim();
      if (input.itemType !== undefined) item.itemType = input.itemType.trim();
      if (input.reorderLevel !== undefined) {
        item.reorderLevel = formatQuantity(input.reorderLevel);
      }
      return repository.save(item);
    });
  }

  async remove(inventoryId: number): Promise<void> {
    const item = await this.findOne(inventoryId);
    try {
      await this.inventory.remove(item);
    } catch (error) {
      if (isForeignKeyConflict(error)) {
        throw new ConflictException(
          'Inventory items with transaction history cannot be deleted.',
        );
      }
      throw error;
    }
  }
}

function formatQuantity(quantity: number): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(quantity));
  if (!match) {
    throw new BadRequestException(
      'Quantity must have at most two decimal places.',
    );
  }
  return `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`;
}

function isForeignKeyConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_ROW_IS_REFERENCED_2'
  );
}
