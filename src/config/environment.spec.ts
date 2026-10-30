import { validateEnvironment } from './environment';

describe('environment configuration', () => {
  it('provides local defaults without needing database credentials', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: '',
    });
  });

  it.each(['', '0', '65536', '3000.5', 'abc', '3e3'])(
    'rejects invalid PORT %j',
    (PORT) => {
      expect(() => validateEnvironment({ PORT })).toThrow('PORT');
    },
  );

  it('rejects invalid runtime environments', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'unknown' })).toThrow(
      'NODE_ENV',
    );
  });

  it.each([
    '*',
    'https://example.com/path',
    'ftp://example.com',
    'https://user:pass@example.com',
  ])('rejects unsafe or malformed browser origins %j', (CORS_ORIGINS) => {
    expect(() => validateEnvironment({ CORS_ORIGINS })).toThrow('CORS_ORIGINS');
  });

  it('accepts explicit comma-separated origins and a custom port', () => {
    expect(
      validateEnvironment({
        PORT: '3001',
        CORS_ORIGINS: 'http://localhost:5173, https://example.com',
      }).PORT,
    ).toBe(3001);
  });
});
