import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { AuthUser, toAuthUser } from './auth-user';

const PASSWORD_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async register(input: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<AuthUser> {
    assertBcryptPasswordLength(input.password);
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing)
      throw new ConflictException('An account with this email already exists.');

    const user = this.users.create({
      fullName: input.fullName.trim(),
      email,
      password: await hash(input.password, PASSWORD_ROUNDS),
      role: UserRole.User,
    });
    try {
      return toAuthUser(await this.users.save(user));
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  }

  async validateCredentials(
    emailInput: string,
    password: string,
  ): Promise<User> {
    assertBcryptPasswordLength(password);
    const email = emailInput.trim().toLowerCase();
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    if (!user || !(await compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return user;
  }

  async findAuthenticatedUser(userId: number): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { userId } });
    if (!user)
      throw new UnauthorizedException('Invalid or expired access token.');
    return toAuthUser(user);
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_DUP_ENTRY'
  );
}

function assertBcryptPasswordLength(password: string): void {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new BadRequestException('Password must not exceed 72 UTF-8 bytes.');
  }
}
