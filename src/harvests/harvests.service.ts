import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toDatabaseDate } from '../common/date-format';
import type { DateRangeQueryDto } from '../common/dto/date-range-query.dto';
import type { AuthUser } from '../auth/auth-user';
import { CropsService } from '../crops/crops.service';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { Harvest } from './entities/harvest.entity';

@Injectable()
export class HarvestsService {
  constructor(
    @InjectRepository(Harvest)
    private readonly harvests: Repository<Harvest>,
    private readonly crops: CropsService,
  ) {}

  async create(input: CreateHarvestDto, actor: AuthUser): Promise<Harvest> {
    await this.crops.findOne(input.cropId, actor);
    const harvest = this.harvests.create({
      cropId: input.cropId,
      harvestDate: toDatabaseDate(input.harvestDate),
      quantityHarvested: input.quantityHarvested.toFixed(2),
      unit: input.unit.trim(),
      notes: input.notes ?? null,
    });
    return this.harvests.save(harvest);
  }

  findAll(actor: AuthUser): Promise<Harvest[]> {
    const query = this.harvests
      .createQueryBuilder('harvest')
      .innerJoin('harvest.crop', 'crop')
      .orderBy('harvest.harvestId', 'ASC');
    if (actor.role !== UserRole.Admin) {
      query.where('crop.userId = :userId', { userId: actor.userId });
    }
    return query.getMany();
  }

  async productionReport(
    range: DateRangeQueryDto,
    actor: AuthUser,
  ): Promise<ProductionReportRow[]> {
    const fromDate = range.fromDate
      ? toDatabaseDate(range.fromDate)
      : undefined;
    const toDate = range.toDate ? toDatabaseDate(range.toDate) : undefined;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'fromDate cannot be later than toDate.',
      );
    }

    const query = this.harvests
      .createQueryBuilder('harvest')
      .innerJoin('harvest.crop', 'crop')
      .select('crop.cropId', 'cropId')
      .addSelect('crop.cropName', 'cropName')
      .addSelect('crop.cropType', 'cropType')
      .addSelect('harvest.unit', 'unit')
      .addSelect('COUNT(harvest.harvestId)', 'harvestCount')
      .addSelect('SUM(harvest.quantityHarvested)', 'totalQuantity')
      .where('1 = 1')
      .groupBy('crop.cropId')
      .addGroupBy('crop.cropName')
      .addGroupBy('crop.cropType')
      .addGroupBy('harvest.unit')
      .orderBy('crop.cropName', 'ASC')
      .addOrderBy('harvest.unit', 'ASC');
    if (actor.role !== UserRole.Admin) {
      query.andWhere('crop.userId = :userId', { userId: actor.userId });
    }
    if (fromDate) {
      query.andWhere('harvest.harvestDate >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('harvest.harvestDate <= :toDate', { toDate });
    }

    const rows = await query.getRawMany<ProductionReportRow>();
    return rows.map((row) => ({
      ...row,
      cropId: Number(row.cropId),
      harvestCount: Number(row.harvestCount),
      totalQuantity: String(row.totalQuantity),
    }));
  }

  findOne(harvestId: number, actor: AuthUser): Promise<Harvest> {
    return this.findAccessibleHarvest(harvestId, actor);
  }

  async update(
    harvestId: number,
    input: UpdateHarvestDto,
    actor: AuthUser,
  ): Promise<Harvest> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one harvest field is required.');
    }
    const harvest = await this.findAccessibleHarvest(harvestId, actor);
    if (input.harvestDate !== undefined) {
      harvest.harvestDate = toDatabaseDate(input.harvestDate);
    }
    if (input.quantityHarvested !== undefined) {
      harvest.quantityHarvested = input.quantityHarvested.toFixed(2);
    }
    if (input.unit !== undefined) harvest.unit = input.unit.trim();
    if (input.notes !== undefined) harvest.notes = input.notes;
    return this.harvests.save(harvest);
  }

  async remove(harvestId: number, actor: AuthUser): Promise<void> {
    const harvest = await this.findAccessibleHarvest(harvestId, actor);
    await this.harvests.remove(harvest);
  }

  private async findAccessibleHarvest(
    harvestId: number,
    actor: AuthUser,
  ): Promise<Harvest> {
    const query = this.harvests
      .createQueryBuilder('harvest')
      .innerJoin('harvest.crop', 'crop')
      .where('harvest.harvestId = :harvestId', { harvestId });
    if (actor.role !== UserRole.Admin) {
      query.andWhere('crop.userId = :userId', { userId: actor.userId });
    }
    const harvest = await query.getOne();
    if (!harvest) throw new NotFoundException('Harvest record not found.');
    return harvest;
  }
}

export interface ProductionReportRow {
  cropId: number;
  cropName: string;
  cropType: string;
  unit: string;
  harvestCount: number;
  totalQuantity: string;
}
