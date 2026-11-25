import { validateEnvironment } from './environment';

const testEnvironment = {
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USERNAME: 'test',
  DB_PASSWORD: '',
  DB_DATABASE: 'cropwise_db',
};

describe('environment configuration', () => {
  it('provides test-only database defaults without connecting to MySQL', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' })).toMatchObject({
      NODE_ENV: 'test',
      PORT: 3000,
      CORS_ORIGINS: '',
      DB_HOST: '127.0.0.1',
      DB_PORT: 3306,
      DB_DATABASE: 'cropwise_db',
    });
  });

  it('requires explicit database configuration outside tests', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow(
      'DB_HOST is required',
    );
  });

  it.each(['', '0', '65536', '3000.5', 'abc', '3e3'])(
    'rejects invalid PORT %j',
    (PORT) => {
      expect(() => validateEnvironment({ ...testEnvironment, PORT })).toThrow(
        'PORT',
      );
    },
  );

  it('rejects invalid runtime environments', () => {
    expect(() =>
      validateEnvironment({ ...testEnvironment, NODE_ENV: 'unknown' }),
    ).toThrow('NODE_ENV');
  });

  it.each([
    '*',
    'https://example.com/path',
    'ftp://example.com',
    'https://user:pass@example.com',
  ])('rejects unsafe or malformed browser origins %j', (CORS_ORIGINS) => {
    expect(() =>
      validateEnvironment({ ...testEnvironment, CORS_ORIGINS }),
    ).toThrow('CORS_ORIGINS');
  });

  it('accepts explicit comma-separated origins and a custom port', () => {
    expect(
      validateEnvironment({
        ...testEnvironment,
        PORT: '3001',
        CORS_ORIGINS: 'http://localhost:5173, https://example.com',
      }).PORT,
    ).toBe(3001);
  });

  it('rejects a database name other than the dedicated project database', () => {
    expect(() =>
      validateEnvironment({ ...testEnvironment, DB_DATABASE: 'mysql' }),
    ).toThrow('DB_DATABASE must be cropwise_db');
  });
});
