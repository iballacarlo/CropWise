import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user';
import { CropsService } from '../crops/crops.service';
import { UserRole } from '../users/entities/user-role.enum';
import { Harvest } from './entities/harvest.entity';
import { HarvestsService } from './harvests.service';

describe('HarvestsService', () => {
  let service: HarvestsService;
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

  beforeEach(() => {
    repository = {
      create: jest.fn((harvest) => harvest),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    cropAccess = { findOne: jest.fn() };
    service = new HarvestsService(
      repository as unknown as Repository<Harvest>,
      cropAccess as unknown as CropsService,
    );
  });

  it('checks crop ownership and stores decimal harvest quantities consistently', async () => {
    cropAccess.findOne.mockResolvedValue({ cropId: 5 } as never);
    repository.save.mockResolvedValue({ harvestId: 4 } as never);

    await service.create(
      {
        cropId: 5,
        harvestDate: '2026-08-10',
        quantityHarvested: 2.5,
        unit: ' kg ',
      },
      user,
    );

    expect(cropAccess.findOne).toHaveBeenCalledWith(5, user);
    expect(repository.create.mock.calls[0][0]).toMatchObject({
      cropId: 5,
      quantityHarvested: '2.500',
      unit: 'kg',
      notes: null,
    });
  });

  it("filters regular users' harvests by crop ownership", async () => {
    const query = createQuery();
    repository.createQueryBuilder.mockReturnValue(query as never);

    await service.findAll(user);

    expect(query.where).toHaveBeenCalledWith('crop.userId = :userId', {
      userId: user.userId,
    });
  });

  it('returns not found for a harvest linked to another user crop', async () => {
    const query = createQuery();
    query.getOne.mockResolvedValue(null as never);
    repository.createQueryBuilder.mockReturnValue(query as never);

    await expect(service.findOne(12, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query.andWhere).toHaveBeenCalledWith('crop.userId = :userId', {
      userId: user.userId,
    });
  });
});

function createQuery() {
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
  query.getMany.mockResolvedValue([] as never);
  query.getOne.mockResolvedValue({ harvestId: 12 } as never);
  return query;
}
