import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment';
import { createDatabaseOptions } from './database-options';

const env = validateEnvironment(process.env);

export default new DataSource(
  createDatabaseOptions({
    DB_HOST: env.DB_HOST,
    DB_PORT: env.DB_PORT,
    DB_USERNAME: env.DB_USERNAME,
    DB_PASSWORD: env.DB_PASSWORD,
    DB_DATABASE: env.DB_DATABASE,
  }),
);
