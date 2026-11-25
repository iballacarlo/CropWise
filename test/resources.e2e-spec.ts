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
import { FarmActivitiesController } from '../src/farm-activities/farm-activities.controller';
import { FarmActivitiesService } from '../src/farm-activities/farm-activities.service';
import { HarvestsController } from '../src/harvests/harvests.controller';
import { HarvestsService } from '../src/harvests/harvests.service';
import { InventoryController } from '../src/inventory/inventory.controller';
import { InventoryService } from '../src/inventory/inventory.service';
import { InventoryTransactionsController } from '../src/inventory-transactions/inventory-transactions.controller';
import { InventoryTransactionsService } from '../src/inventory-transactions/inventory-transactions.service';
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
  const activitiesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const harvestsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const inventoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findLowStock: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const inventoryTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const tokens = { admin: '', user: '', expired: '' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'phase-five-test-secret' }),
      ],
      controllers: [
        UsersController,
        CropsController,
        FarmActivitiesController,
        HarvestsController,
        InventoryController,
        InventoryTransactionsController,
      ],
      providers: [
        RolesGuard,
        TestJwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: CropsService, useValue: cropsService },
        { provide: FarmActivitiesService, useValue: activitiesService },
        { provide: HarvestsService, useValue: harvestsService },
        { provide: InventoryService, useValue: inventoryService },
        {
          provide: InventoryTransactionsService,
          useValue: inventoryTransactionsService,
        },
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
    tokens.expired = jwt.sign(
      {
        userId: 7,
        fullName: 'Test User',
        email: 'user@example.com',
        role: UserRole.User,
      },
      { expiresIn: -1 },
    );
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

  it('rejects malformed and expired JWTs before reaching a controller', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer malformed-token')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokens.expired}`)
      .expect(401);
    expect(usersService.findAll).not.toHaveBeenCalled();
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
        plantingDate: '05/01/2026',
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
        plantingDate: '05/01/2026',
      })
      .expect(201)
      .expect({ cropId: 8, cropName: 'Rice', userId: 7 });
    const createCall = cropsService.create.mock.calls[0] as unknown as [
      Record<string, unknown>,
      AuthUser,
    ];
    expect(createCall[1].userId).toBe(7);
  });

  it('rejects invalid calendar dates in crop requests', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/crops')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        cropName: 'Rice',
        cropType: 'Grain',
        plantingDate: '02/30/2026',
      })
      .expect(400);
    expect(cropsService.create).not.toHaveBeenCalled();
  });

  it('rejects farm activity and harvest requests without a JWT', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/farm-activities')
      .expect(401);
    await request(app.getHttpServer()).get('/api/v1/harvests').expect(401);
  });

  it('rejects a nonpositive harvest quantity', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/harvests')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        cropId: 8,
        harvestDate: '08/10/2026',
        quantityHarvested: 0,
        unit: 'kg',
      })
      .expect(400);
    expect(harvestsService.create).not.toHaveBeenCalled();
  });

  it('rejects moving an activity or harvest to a different crop on update', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/farm-activities/3')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({ cropId: 9 })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/v1/harvests/4')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({ cropId: 9 })
      .expect(400);
    expect(activitiesService.update).not.toHaveBeenCalled();
    expect(harvestsService.update).not.toHaveBeenCalled();
  });

  it('creates an activity using the authenticated account', async () => {
    activitiesService.create.mockResolvedValue({
      activityId: 6,
      cropId: 8,
      activityName: 'Watering',
    } as never);
    await request(app.getHttpServer())
      .post('/api/v1/farm-activities')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        cropId: 8,
        activityName: 'Watering',
        activityDate: '06/15/2026',
      })
      .expect(201)
      .expect({ activityId: 6, cropId: 8, activityName: 'Watering' });
    const createCall = activitiesService.create.mock.calls[0] as unknown as [
      Record<string, unknown>,
      AuthUser,
    ];
    expect(createCall[1].userId).toBe(7);
  });

  it('limits inventory management writes to Admins', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({ itemName: 'Seeds', itemType: 'Supply', unit: 'kg' })
      .expect(403);
    expect(inventoryService.create).not.toHaveBeenCalled();

    inventoryService.create.mockResolvedValue({
      inventoryId: 3,
      itemName: 'Seeds',
      quantity: '0.000',
      unit: 'kg',
    } as never);
    await request(app.getHttpServer())
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ itemName: 'Seeds', itemType: 'Supply', unit: 'kg' })
      .expect(201)
      .expect({
        inventoryId: 3,
        itemName: 'Seeds',
        quantity: '0.000',
        unit: 'kg',
      });
  });

  it('rejects a client-supplied transaction owner and invalid quantity', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inventory-transactions')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        inventoryId: 3,
        transactionType: 'IN',
        quantity: 2,
        userId: 1,
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/inventory-transactions')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({ inventoryId: 3, transactionType: 'OUT', quantity: 0 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/inventory-transactions')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        inventoryId: 3,
        transactionType: 'IN',
        quantity: 1,
        transactionDate: '2026-07-01T12:00:00.000Z',
      })
      .expect(400);
    expect(inventoryTransactionsService.create).not.toHaveBeenCalled();
  });

  it('creates a transaction for the authenticated user', async () => {
    inventoryTransactionsService.create.mockResolvedValue({
      transactionId: 6,
      inventoryId: 3,
      userId: 7,
      transactionType: 'IN',
      quantity: '2.000',
    } as never);
    await request(app.getHttpServer())
      .post('/api/v1/inventory-transactions')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({
        inventoryId: 3,
        transactionType: 'IN',
        quantity: 2,
        transactionDate: '07/01/2026 12:00:00',
      })
      .expect(201)
      .expect({
        transactionId: 6,
        inventoryId: 3,
        userId: 7,
        transactionType: 'IN',
        quantity: '2.000',
      });
    const createCall = inventoryTransactionsService.create.mock
      .calls[0] as unknown as [Record<string, unknown>, AuthUser];
    expect(createCall[1].userId).toBe(7);
    expect(createCall[0].transactionDate).toBe('07/01/2026 12:00:00');
  });

  it('restricts inventory transaction edits to Admins', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/inventory-transactions/6')
      .set('Authorization', `Bearer ${tokens.user}`)
      .send({ quantity: 1 })
      .expect(403);
    expect(inventoryTransactionsService.update).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
