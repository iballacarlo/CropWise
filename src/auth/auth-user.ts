import type { User } from '../users/entities/user.entity';

export type AuthUser = Pick<User, 'userId' | 'fullName' | 'email' | 'role'>;

export function toAuthUser(user: User): AuthUser {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}
