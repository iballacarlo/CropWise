import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcrypt';
import { Repository } from 'typeorm';
import { toAuthUser, type AuthUser } from '../auth/auth-user';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const PASSWORD_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(input: CreateUserDto): Promise<AuthUser> {
    assertPasswordLength(input.password);
    const email = input.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('An account with this email already exists.');
    }

    const user = this.users.create({
      fullName: input.fullName.trim(),
      email,
      password: await hash(input.password, PASSWORD_ROUNDS),
      role: input.role ?? UserRole.Farmer,
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

  async findAll(): Promise<AuthUser[]> {
    const users = await this.users.find({ order: { userId: 'ASC' } });
    return users.map(toAuthUser);
  }

  async findOne(userId: number): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('User not found.');
    return toAuthUser(user);
  }

  async update(
    userId: number,
    input: UpdateUserDto,
    actorId: number,
  ): Promise<AuthUser> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('At least one user field is required.');
    }
    const user = await this.users.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (userId === actorId && input.role && input.role !== user.role) {
      throw new ConflictException('You cannot change your own account role.');
    }

    if (input.fullName !== undefined) user.fullName = input.fullName.trim();
    if (input.email !== undefined)
      user.email = input.email.trim().toLowerCase();
    if (input.role !== undefined) user.role = input.role;
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

  async remove(userId: number, actorId: number): Promise<void> {
    if (userId === actorId) {
      throw new ConflictException('You cannot delete your own account.');
    }
    const user = await this.users.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('User not found.');
    try {
      await this.users.remove(user);
    } catch (error) {
      if (isForeignKeyConflict(error)) {
        throw new ConflictException(
          'This user has related crop or inventory records and cannot be deleted.',
        );
      }
      throw error;
    }
  }
}

function assertPasswordLength(password: string): void {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new BadRequestException('Password must not exceed 72 UTF-8 bytes.');
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

function isForeignKeyConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_ROW_IS_REFERENCED_2'
  );
}
