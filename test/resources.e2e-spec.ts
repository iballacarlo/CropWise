import { Injectable } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { ExtractJwt, Strategy } from 'passport-jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { AuthUser } from '../src/auth/auth-user';
import { RolesGuard } from '../src/auth/roles.guard';
import { CropsController } from '../src/crops/crops.controller';
import { CropsService } from '../src/crops/crops.service';
import { UsersController } from '../src/users/users.controller';
import { UserRole } from '../src/users/entities/user-role.enum';
import { UsersService } from '../src/users/users.service';
import { configureApp } from '../src/common/configure-app';

@Injectable()
class TestJwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'phase-five-test-secret',
    });
  }

  validate(payload: AuthUser) {
    return payload;
  }
}

describe('Users and crops routes (e2e)', () => {
  let app: INestApplication<App>;
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const cropsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const tokens = { admin: '', user: '' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'phase-five-test-secret' }),
      ],
      controllers: [UsersController, CropsController],
      providers: [
        RolesGuard,
        TestJwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: CropsService, useValue: cropsService },
        {
          provide: ConfigService,
          useValue: new ConfigService({ CORS_ORIGINS: '' }),
        },
      ],
    }).compile();

    app = module.createNestApplication();
    const jwt = app.get(JwtService);
    tokens.admin = jwt.sign({
      userId: 1,
      fullName: 'Test Admin',
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    tokens.user = jwt.sign({
      userId: 7,
      fullName: 'Test User',
      email: 'user@example.com',
      role: UserRole.User,
    });
    app.useLogger(false);
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects user management without authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('restricts user management to the Admin role', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokens.user}`)
      .expect(403);
  });

  it('allows Admins to list users', async () => {
    usersService.findAll.mockResolvedValue([
      {
        userId: 7,
        fullName: 'Test User',
        email: 'user@example.com',
        role: UserRole.User,
      },
    ] as never);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200)
      .expect([
        {
          userId: 7,
          fullName: 'Test User',
          email: 'user@example.com',
          role: UserRole.User,
        },
      ]);
  });

  it('rejects a client-supplied crop owner id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        cropName: 'Rice',
        cropType: 'Grain',
        plantingDate: '2026-05-01',
        userId: 1,
      })
      .expect(400);
    expect(cropsService.create).not.toHaveBeenCalled();
  });

  it('creates a crop for the authenticated user', async () => {
    cropsService.create.mockResolvedValue({
      cropId: 8,
      cropName: 'Rice',
      userId: 7,
    } as never);
    await request(app.getHttpServer())
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        cropName: 'Rice',
        cropType: 'Grain',
        plantingDate: '2026-05-01',
      })
      .expect(201)
      .expect({ cropId: 8, cropName: 'Rice', userId: 7 });
    const createCall = cropsService.create.mock.calls[0] as unknown as [
      Record<string, unknown>,
      AuthUser,
    ];
    expect(createCall[1].userId).toBe(7);
  });

  afterAll(async () => {
    await app.close();
  });
});
