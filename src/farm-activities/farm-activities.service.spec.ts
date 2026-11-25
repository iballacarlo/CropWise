import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user';
import { CropsService } from '../crops/crops.service';
import { UserRole } from '../users/entities/user-role.enum';
import { FarmActivity } from './entities/farm-activity.entity';
import { FarmActivitiesService } from './farm-activities.service';

describe('FarmActivitiesService', () => {
  let service: FarmActivitiesService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let cropAccess: { findOne: jest.Mock };
  const user: AuthUser = {
    userId: 7,
    fullName: 'Crop User',
    email: 'user@example.com',
    role: UserRole.User,
  };
  const admin: AuthUser = { ...user, userId: 1, role: UserRole.Admin };

  beforeEach(() => {
    repository = {
      create: jest.fn((activity) => activity),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    cropAccess = { findOne: jest.fn() };
    service = new FarmActivitiesService(
      repository as unknown as Repository<FarmActivity>,
      cropAccess as unknown as CropsService,
    );
  });

  it('checks crop access before creating an activity', async () => {
    cropAccess.findOne.mockResolvedValue({ cropId: 5 } as never);
    repository.save.mockResolvedValue({ activityId: 9 } as never);

    await service.create(
      {
        cropId: 5,
        activityName: '  Watering ',
        activityDate: '2026-05-03',
      },
      user,
    );

    expect(cropAccess.findOne).toHaveBeenCalledWith(5, user);
    expect(repository.create.mock.calls[0][0]).toMatchObject({
      cropId: 5,
      activityName: 'Watering',
      notes: null,
    });
  });

  it("scopes a user's list to their crop and lets Admins see all", async () => {
    const query = createQuery({ getMany: [] });
    repository.createQueryBuilder.mockReturnValue(query as never);

    await service.findAll(user);
    expect(query.where).toHaveBeenCalledWith('crop.userId = :userId', {
      userId: user.userId,
    });

    query.where.mockClear();
    await service.findAll(admin);
    expect(query.where).not.toHaveBeenCalled();
  });

  it("returns not found for an activity outside the user's crops", async () => {
    const query = createQuery({ getOne: null });
    repository.createQueryBuilder.mockReturnValue(query as never);

    await expect(service.findOne(99, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query.andWhere).toHaveBeenCalledWith('crop.userId = :userId', {
      userId: user.userId,
    });
  });
});

function createQuery(result: { getMany?: unknown[]; getOne?: unknown }) {
  const query = {
    innerJoin: jest.fn(),
    orderBy: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  query.innerJoin.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.andWhere.mockReturnValue(query);
  query.getMany.mockResolvedValue((result.getMany ?? []) as never);
  query.getOne.mockResolvedValue((result.getOne ?? null) as never);
  return query;
}
