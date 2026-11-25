import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user';
import { UserRole } from '../users/entities/user-role.enum';
import { Crop } from './entities/crop.entity';
import { CropStatus } from './entities/crop-status.enum';
import { CropsService } from './crops.service';

describe('CropsService', () => {
  let service: CropsService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  const user: AuthUser = {
    userId: 11,
    fullName: 'Crop User',
    email: 'user@example.com',
    role: UserRole.User,
  };
  const admin: AuthUser = { ...user, userId: 1, role: UserRole.Admin };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((crop) => crop),
      save: jest.fn(),
      remove: jest.fn(),
    };
    service = new CropsService(repository as unknown as Repository<Crop>);
  });

  it('assigns crop ownership from the authenticated account', async () => {
    repository.save.mockResolvedValue({ cropId: 5 } as never);
    const input = {
      cropName: '  Rice ',
      cropType: '  Grain ',
      plantingDate: '01/10/2026',
      userId: 999,
    } as never;

    await service.create(input, user);
    const saved = repository.create.mock.calls[0][0] as Crop;
    expect(saved.userId).toBe(user.userId);
    expect(saved.cropName).toBe('Rice');
    expect(saved.cropType).toBe('Grain');
    expect(saved.plantingDate).toBe('2026-01-10');
  });

  it('limits regular users to their own crop list and gives admins all crops', async () => {
    repository.find.mockResolvedValue([] as never);
    await service.findAll(user);
    expect(repository.find.mock.calls[0][0]).toMatchObject({
      where: { userId: user.userId },
    });

    await service.findAll(admin);
    expect(repository.find.mock.calls[1][0]).not.toHaveProperty('where');
  });

  it('returns not found for crops outside the user account', async () => {
    repository.findOne.mockResolvedValue(null as never);
    await expect(service.findOne(99, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne.mock.calls[0][0]).toMatchObject({
      where: { cropId: 99, userId: user.userId },
    });
  });

  it('rejects an expected harvest date before planting', async () => {
    await expect(
      service.create(
        {
          cropName: 'Rice',
          cropType: 'Grain',
          plantingDate: '05/01/2026',
          expectedHarvestDate: '04/30/2026',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects deleting a crop with linked activities or harvests', async () => {
    repository.findOne.mockResolvedValue({
      cropId: 5,
      userId: user.userId,
    } as never);
    repository.remove.mockRejectedValue({
      code: 'ER_ROW_IS_REFERENCED_2',
    } as never);

    await expect(service.remove(5, user)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('uses the Planned status when requested on crop creation', async () => {
    repository.save.mockResolvedValue({ cropId: 5 } as never);
    await service.create(
      {
        cropName: 'Rice',
        cropType: 'Grain',
        plantingDate: '05/01/2026',
        cropStatus: CropStatus.Planned,
      },
      user,
    );
    expect((repository.create.mock.calls[0][0] as Crop).cropStatus).toBe(
      CropStatus.Planned,
    );
  });
});
