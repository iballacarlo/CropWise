import { createDatabaseOptions } from './database-options';

describe('TypeORM database options', () => {
  it('uses only the CropWise database and keeps schema synchronization disabled', () => {
    const options = createDatabaseOptions({
      DB_HOST: '127.0.0.1',
      DB_PORT: 3306,
      DB_USERNAME: 'cropwise_user',
      DB_PASSWORD: 'local-only',
      DB_DATABASE: 'cropwise_db',
    });

    expect(options).toMatchObject({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'cropwise_user',
      database: 'cropwise_db',
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      migrationsRun: false,
    });
    expect(options.entities).toHaveLength(1);
    expect(options.migrations).toHaveLength(1);
  });

  it('uses compiled migration paths for production', () => {
    const oldEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const options = createDatabaseOptions({
        DB_HOST: '127.0.0.1',
        DB_PORT: 3306,
        DB_USERNAME: 'cropwise_user',
        DB_PASSWORD: 'local-only',
        DB_DATABASE: 'cropwise_db',
      });

      expect(options.entities).toEqual([expect.stringContaining('dist')]);
      expect(options.migrations).toEqual([expect.stringContaining('dist')]);
    } finally {
      if (oldEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = oldEnvironment;
      }
    }
  });
});
