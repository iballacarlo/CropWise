import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toDatabaseDate } from '../common/date-format';
import type { AuthUser } from '../auth/auth-user';
import { UserRole } from '../users/entities/user-role.enum';
import { Crop } from './entities/crop.entity';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
  ) {}

  async create(input: CreateCropDto, actor: AuthUser): Promise<Crop> {
    const plantingDate = toDatabaseDate(input.plantingDate);
    const expectedHarvestDate = input.expectedHarvestDate
      ? toDatabaseDate(input.expectedHarvestDate)
      : null;
    validateDateRange(plantingDate, expectedHarvestDate);
    const crop = this.crops.create({
      ...input,
      plantingDate,
      cropName: input.cropName.trim(),
      cropType: input.cropType.trim(),
      expectedHarvestDate,
      userId: actor.userId,
    });
    return this.crops.save(crop);
  }

  findAll(actor: AuthUser): Promise<Crop[]> {
    return actor.role === UserRole.Admin
      ? this.crops.find({ order: { cropId: 'ASC' } })
      : this.crops.find({
          where: { userId: actor.userId },
          order: { cropId: 'ASC' },
        });
  }

  findOne(cropId: number, actor: AuthUser): Promise<Crop> {
    return this.findOwnedCrop(cropId, actor);
  }

  async update(
    cropId: number,
    input: UpdateCropDto,
    actor: AuthUser,
  ): Promise<Crop> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one crop field is required.');
    }
    const crop = await this.findOwnedCrop(cropId, actor);
    const plantingDate = input.plantingDate
      ? toDatabaseDate(input.plantingDate)
      : crop.plantingDate;
    const expectedHarvestDate =
      input.expectedHarvestDate === undefined
        ? crop.expectedHarvestDate
        : input.expectedHarvestDate === null
          ? null
          : toDatabaseDate(input.expectedHarvestDate);
    validateDateRange(plantingDate, expectedHarvestDate);
    if (input.cropName !== undefined) crop.cropName = input.cropName.trim();
    if (input.cropType !== undefined) crop.cropType = input.cropType.trim();
    if (input.plantingDate !== undefined) crop.plantingDate = plantingDate;
    if (input.expectedHarvestDate !== undefined) {
      crop.expectedHarvestDate = expectedHarvestDate;
    }
    if (input.cropStatus !== undefined) crop.cropStatus = input.cropStatus;
    return this.crops.save(crop);
  }

  async remove(cropId: number, actor: AuthUser): Promise<void> {
    const crop = await this.findOwnedCrop(cropId, actor);
    try {
      await this.crops.remove(crop);
    } catch (error) {
      if (isForeignKeyConflict(error)) {
        throw new ConflictException(
          'This crop has farm activities or harvest records and cannot be deleted.',
        );
      }
      throw error;
    }
  }

  private async findOwnedCrop(cropId: number, actor: AuthUser): Promise<Crop> {
    const where =
      actor.role === UserRole.Admin
        ? { cropId }
        : { cropId, userId: actor.userId };
    const crop = await this.crops.findOne({ where });
    if (!crop) throw new NotFoundException('Crop not found.');
    return crop;
  }
}

function validateDateRange(
  plantingDate: string,
  expectedHarvestDate: string | null | undefined,
): void {
  if (expectedHarvestDate && expectedHarvestDate < plantingDate) {
    throw new BadRequestException(
      'Expected harvest date cannot be before planting date.',
    );
  }
}

function isForeignKeyConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_ROW_IS_REFERENCED_2'
  );
}
