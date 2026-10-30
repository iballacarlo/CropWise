export function validateEnvironment(values: Record<string, unknown>) {
  const nodeEnv = values.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(nodeEnv))) {
    throw new Error('NODE_ENV must be development, test, or production.');
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

  return {
    ...values,
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGINS: corsOrigins,
  };
}
