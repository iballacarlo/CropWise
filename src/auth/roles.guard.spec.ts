import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { UserRole } from '../users/entities/user-role.enum';
import type { AuthUser } from './auth-user';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const principal: AuthUser = {
    userId: 1,
    fullName: 'Account',
    email: 'account@example.com',
    role: UserRole.Admin,
  };

  function guardFor(role: UserRole | undefined, required: UserRole[]) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { ...principal, role } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
    return guard.canActivate(context);
  }

  it('allows an account with a required role', () => {
    expect(guardFor(UserRole.Admin, [UserRole.Admin])).toBe(true);
  });

  it('rejects an account without the required role', () => {
    expect(guardFor(UserRole.Farmer, [UserRole.Admin])).toBe(false);
  });

  it('allows routes without role metadata', () => {
    expect(guardFor(undefined, [])).toBe(true);
  });
});
