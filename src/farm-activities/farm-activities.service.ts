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
import { CreateFarmActivityDto } from './dto/create-farm-activity.dto';
import { UpdateFarmActivityDto } from './dto/update-farm-activity.dto';
import { FarmActivity } from './entities/farm-activity.entity';

@Injectable()
export class FarmActivitiesService {
  constructor(
    @InjectRepository(FarmActivity)
    private readonly activities: Repository<FarmActivity>,
    private readonly crops: CropsService,
  ) {}

  async create(
    input: CreateFarmActivityDto,
    actor: AuthUser,
  ): Promise<FarmActivity> {
    await this.crops.findOne(input.cropId, actor);
    const activity = this.activities.create({
      cropId: input.cropId,
      activityName: input.activityName.trim(),
      activityDate: toDatabaseDate(input.activityDate),
      notes: input.notes ?? null,
    });
    return this.activities.save(activity);
  }

  findAll(actor: AuthUser): Promise<FarmActivity[]> {
    const query = this.activities
      .createQueryBuilder('activity')
      .innerJoin('activity.crop', 'crop')
      .orderBy('activity.activityId', 'ASC');
    if (actor.role !== UserRole.Admin) {
      query.where('crop.userId = :userId', { userId: actor.userId });
    }
    return query.getMany();
  }

  findSchedule(
    range: DateRangeQueryDto,
    actor: AuthUser,
  ): Promise<FarmActivity[]> {
    const fromDate = range.fromDate
      ? toDatabaseDate(range.fromDate)
      : undefined;
    const toDate = range.toDate ? toDatabaseDate(range.toDate) : undefined;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'fromDate cannot be later than toDate.',
      );
    }

    const query = this.activities
      .createQueryBuilder('activity')
      .innerJoin('activity.crop', 'crop')
      .where('1 = 1')
      .orderBy('activity.activityDate', 'ASC')
      .addOrderBy('activity.activityId', 'ASC');
    if (actor.role !== UserRole.Admin) {
      query.andWhere('crop.userId = :userId', { userId: actor.userId });
    }
    if (fromDate) {
      query.andWhere('activity.activityDate >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('activity.activityDate <= :toDate', { toDate });
    }
    return query.getMany();
  }

  findOne(activityId: number, actor: AuthUser): Promise<FarmActivity> {
    return this.findAccessibleActivity(activityId, actor);
  }

  async update(
    activityId: number,
    input: UpdateFarmActivityDto,
    actor: AuthUser,
  ): Promise<FarmActivity> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one activity field is required.');
    }
    const activity = await this.findAccessibleActivity(activityId, actor);
    if (input.activityName !== undefined) {
      activity.activityName = input.activityName.trim();
    }
    if (input.activityDate !== undefined) {
      activity.activityDate = toDatabaseDate(input.activityDate);
    }
    if (input.notes !== undefined) activity.notes = input.notes;
    return this.activities.save(activity);
  }

  async remove(activityId: number, actor: AuthUser): Promise<void> {
    const activity = await this.findAccessibleActivity(activityId, actor);
    await this.activities.remove(activity);
  }

  private async findAccessibleActivity(
    activityId: number,
    actor: AuthUser,
  ): Promise<FarmActivity> {
    const query = this.activities
      .createQueryBuilder('activity')
      .innerJoin('activity.crop', 'crop')
      .where('activity.activityId = :activityId', { activityId });
    if (actor.role !== UserRole.Admin) {
      query.andWhere('crop.userId = :userId', { userId: actor.userId });
    }
    const activity = await query.getOne();
    if (!activity) throw new NotFoundException('Farm activity not found.');
    return activity;
  }
}
