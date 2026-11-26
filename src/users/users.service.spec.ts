import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { compare } from 'bcrypt';
import type { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((user) => user),
      save: jest.fn(),
      remove: jest.fn(),
    };
    service = new UsersService(repository as unknown as Repository<User>);
  });

  it('creates an admin with a hashed password and returns a safe account', async () => {
    repository.findOne.mockResolvedValue(null as never);
    repository.save.mockResolvedValue({
      userId: 4,
      fullName: 'Farm Admin',
      email: 'admin@example.com',
      password: 'stored-hash',
      role: UserRole.Admin,
    } as never);

    const result = await service.create({
      fullName: ' Farm Admin ',
      email: ' ADMIN@EXAMPLE.COM ',
      password: 'a-strong-password',
      role: UserRole.Admin,
    });
    const saved = repository.save.mock.calls[0][0] as User;

    expect(saved.email).toBe('admin@example.com');
    expect(saved.password).not.toBe('a-strong-password');
    expect(await compare('a-strong-password', saved.password)).toBe(true);
    expect(result).toEqual({
      userId: 4,
      fullName: 'Farm Admin',
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('rejects duplicate email addresses', async () => {
    repository.findOne.mockResolvedValue({ userId: 2 } as never);
    await expect(
      service.create({
        fullName: 'Farm User',
        email: 'taken@example.com',
        password: 'a-strong-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns only safe users from the user list', async () => {
    repository.find.mockResolvedValue([
      {
        userId: 1,
        fullName: 'Farm User',
        email: 'user@example.com',
        password: 'never-selected',
        role: UserRole.Farmer,
      },
    ] as never);

    await expect(service.findAll()).resolves.toEqual([
      {
        userId: 1,
        fullName: 'Farm User',
        email: 'user@example.com',
        role: UserRole.Farmer,
      },
    ]);
  });

  it('rejects deleting the acting administrator and reports missing users', async () => {
    await expect(service.remove(4, 4)).rejects.toBeInstanceOf(
      ConflictException,
    );
    repository.findOne.mockResolvedValue(null as never);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents an administrator from changing their own role', async () => {
    repository.findOne.mockResolvedValue({
      userId: 4,
      fullName: 'Farm Admin',
      email: 'admin@example.com',
      role: UserRole.Admin,
    } as never);

    await expect(
      service.update(4, { role: UserRole.Farmer }, 4),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('maps users referenced by domain records to a conflict', async () => {
    repository.findOne.mockResolvedValue({ userId: 8 } as never);
    repository.remove.mockRejectedValue({
      code: 'ER_ROW_IS_REFERENCED_2',
    } as never);

    await expect(service.remove(8, 4)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
