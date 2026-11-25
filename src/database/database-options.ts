import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export interface DatabaseConfig {
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
}

export function createDatabaseOptions(
  config: DatabaseConfig,
): DataSourceOptions {
  const databaseDirectory =
    process.env.NODE_ENV === 'production'
      ? join(process.cwd(), 'dist', 'database')
      : join(process.cwd(), 'src', 'database');

  return {
    type: 'mysql',
    host: config.DB_HOST,
    port: config.DB_PORT,
    username: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    database: config.DB_DATABASE,
    entities: [join(databaseDirectory, 'entities', '**', '*.entity{.ts,.js}')],
    migrations: [join(databaseDirectory, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
  };
}
