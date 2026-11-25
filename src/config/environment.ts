export function validateEnvironment(values: Record<string, unknown>) {
  const nodeEnv = values.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(nodeEnv))) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }
  const isTest = nodeEnv === 'test';

  const jwtSecret = String(
    values.JWT_SECRET ??
      (isTest ? 'test-only-secret-that-is-not-used-in-production' : ''),
  );
  if (!isTest && Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  }
  const jwtExpiresIn = String(values.JWT_EXPIRES_IN ?? '1h');
  if (!/^[1-9]\d*[smhd]$/.test(jwtExpiresIn)) {
    throw new Error('JWT_EXPIRES_IN must use a duration such as 15m or 1h.');
  }

  const rawPort = String(values.PORT ?? '3000');
  const port = Number(rawPort);
  if (
    !/^\d+$/.test(rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const corsOrigins = String(values.CORS_ORIGINS ?? '').trim();
  for (const entry of corsOrigins.split(',').filter((value) => value.trim())) {
    const origin = entry.trim();
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain valid HTTP(S) origins.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(
        'CORS_ORIGINS must contain exact HTTP(S) origins without paths or wildcards.',
      );
    }
  }

  const dbHost = String(values.DB_HOST ?? (isTest ? '127.0.0.1' : '')).trim();
  if (!dbHost) {
    throw new Error('DB_HOST is required.');
  }

  const rawDbPort = String(values.DB_PORT ?? (isTest ? '3306' : ''));
  const dbPort = Number(rawDbPort);
  if (
    !/^\d+$/.test(rawDbPort) ||
    !Number.isInteger(dbPort) ||
    dbPort < 1 ||
    dbPort > 65535
  ) {
    throw new Error('DB_PORT must be an integer between 1 and 65535.');
  }

  const dbUsername = String(
    values.DB_USERNAME ?? (isTest ? 'test' : ''),
  ).trim();
  if (!dbUsername) {
    throw new Error('DB_USERNAME is required.');
  }

  if (values.DB_PASSWORD === undefined && !isTest) {
    throw new Error(
      'DB_PASSWORD must be set in .env. Use an empty value only if your MySQL account has no password.',
    );
  }
  if (
    values.DB_PASSWORD !== undefined &&
    typeof values.DB_PASSWORD !== 'string'
  ) {
    throw new Error('DB_PASSWORD must be a string.');
  }

  const dbDatabase = String(
    values.DB_DATABASE ?? (isTest ? 'cropwise_db' : ''),
  ).trim();
  if (dbDatabase !== 'cropwise_db') {
    throw new Error('DB_DATABASE must be cropwise_db.');
  }

  return {
    ...values,
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGINS: corsOrigins,
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_USERNAME: dbUsername,
    DB_PASSWORD: values.DB_PASSWORD ?? '',
    DB_DATABASE: dbDatabase,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
  };
}
