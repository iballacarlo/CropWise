import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { compare, hash } from 'bcrypt';
import type { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((user) => user),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    service = new AuthService(repository as unknown as Repository<User>);
  });

  it('stores a password hash and always registers the standard role', async () => {
    repository.findOne.mockResolvedValue(null as never);
    repository.save.mockResolvedValue({
      userId: 7,
      fullName: 'Crop User',
      email: 'person@example.com',
      password: 'saved-hash',
      role: UserRole.User,
    } as never);

    const result = await service.register({
      fullName: '  Crop User  ',
      email: '  PERSON@EXAMPLE.COM ',
      password: 'a-strong-password',
    });

    const saved = repository.save.mock.calls[0][0] as User;
    expect(saved.fullName).toBe('Crop User');
    expect(saved.email).toBe('person@example.com');
    expect(saved.password).not.toBe('a-strong-password');
    expect(await compare('a-strong-password', saved.password)).toBe(true);
    expect(saved.role).toBe(UserRole.User);
    expect(result).toEqual({
      userId: 7,
      fullName: 'Crop User',
      email: 'person@example.com',
      role: UserRole.User,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('rejects an existing email', async () => {
    repository.findOne.mockResolvedValue({ userId: 1 } as never);

    await expect(
      service.register({
        fullName: 'Crop User',
        email: 'person@example.com',
        password: 'a-strong-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('validates a password hash and rejects invalid credentials', async () => {
    const user = {
      userId: 1,
      fullName: 'Crop User',
      email: 'person@example.com',
      role: UserRole.User,
      password: await hash('a-strong-password', 4),
    } as User;
    const builder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user as never),
    };
    repository.createQueryBuilder.mockReturnValue(builder as never);

    await expect(
      service.validateCredentials(' PERSON@EXAMPLE.COM ', 'a-strong-password'),
    ).resolves.toBe(user);
    await expect(
      service.validateCredentials('person@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
