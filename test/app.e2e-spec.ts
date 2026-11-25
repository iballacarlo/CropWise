import { Test, TestingModule } from '@nestjs/testing';
import { Body, Controller, Get, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/configure-app';

class ValidationProbeDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

// Test-only routes exercise the shared HTTP configuration without shipping
// placeholder business endpoints in the real application.
@Controller('configuration-probe')
class ConfigurationProbeController {
  @Post()
  validate(@Body() body: ValidationProbeDto) {
    return body;
  }

  @Get('failure')
  fail(): never {
    throw new Error('private diagnostic details');
  }

  @Get('dates')
  dates() {
    return [
      {
        plantingDate: '2026-02-03',
        expectedHarvestDate: null,
        transactionDate: new Date(2026, 1, 3, 4, 5, 6),
      },
      { harvestDate: '2026-09-01' },
    ];
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ConfigurationProbeController],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          PORT: 3000,
          CORS_ORIGINS: 'http://localhost:5173',
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    configureApp(app);
    await app.init();
  });

  it('/api/v1 (GET) preserves the existing endpoint under the API prefix', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('does not expose the old unprefixed endpoint', async () => {
    await request(app.getHttpServer()).get('/').expect(404);
  });

  it('returns a standard JSON 404 for unknown API routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/missing')
      .expect(404);
    expect(response.body.statusCode).toBe(404);
  });

  it('validates and transforms DTO input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/configuration-probe')
      .send({ name: 'Seeds', quantity: '2' })
      .expect(201)
      .expect({ name: 'Seeds', quantity: 2 });
  });

  it('rejects invalid data without exposing submitted values', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/configuration-probe')
      .send({ name: '', quantity: -1 })
      .expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(expect.any(Array));
  });

  it('rejects unknown request fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/configuration-probe')
      .send({ name: 'Seeds', quantity: 2, Role: 'Admin' })
      .expect(400);
    expect(response.body.message).toContain('property Role should not exist');
  });

  it('formats database dates for API responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/configuration-probe/dates')
      .expect(200);
    expect(response.body).toEqual([
      {
        plantingDate: '02/03/2026',
        expectedHarvestDate: null,
        transactionDate: '02/03/2026 04:05:06',
      },
      { harvestDate: '09/01/2026' },
    ]);
  });

  it('allows the configured browser origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });

  it('does not grant CORS access to other browser origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Origin', 'https://untrusted.example')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('handles preflight requests with the Authorization header', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);
    expect(response.headers['access-control-allow-headers']).toContain(
      'Authorization',
    );
  });

  it('hides unexpected exception details', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/configuration-probe/failure')
      .expect(500);
    expect(response.body.message).toBe('Internal server error');
    expect(JSON.stringify(response.body)).not.toContain(
      'private diagnostic details',
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
