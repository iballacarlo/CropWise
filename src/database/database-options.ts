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
  useCompiledFiles = process.env.NODE_ENV === 'production',
): DataSourceOptions {
  const sourceDirectory = join(
    process.cwd(),
    useCompiledFiles ? 'dist' : 'src',
  );
  const databaseDirectory = join(sourceDirectory, 'database');

  return {
    type: 'mysql',
    host: config.DB_HOST,
    port: config.DB_PORT,
    username: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    database: config.DB_DATABASE,
    entities: [join(sourceDirectory, '**', '*.entity{.ts,.js}')],
    migrations: [join(databaseDirectory, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'each',
    synchronize: false,
    migrationsRun: false,
  };
}
