import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { validateEnvironment } from './config/environment';
import { createDatabaseOptions } from './database/database-options';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CropsModule } from './crops/crops.module';
import { FarmActivitiesModule } from './farm-activities/farm-activities.module';
import { HarvestsModule } from './harvests/harvests.module';

const databaseModules =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            ...createDatabaseOptions(
              {
                DB_HOST: config.getOrThrow<string>('DB_HOST'),
                DB_PORT: config.getOrThrow<number>('DB_PORT'),
                DB_USERNAME: config.getOrThrow<string>('DB_USERNAME'),
                DB_PASSWORD: config.getOrThrow<string>('DB_PASSWORD'),
                DB_DATABASE: config.getOrThrow<'cropwise_db'>('DB_DATABASE'),
              },
              true,
            ),
            retryAttempts: 1,
            retryDelay: 1000,
          }),
        }),
      ];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ...databaseModules,
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [
          AuthModule,
          UsersModule,
          CropsModule,
          FarmActivitiesModule,
          HarvestsModule,
        ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
