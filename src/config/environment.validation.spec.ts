import {
  normalizeApiPrefix,
  validateEnvironment,
} from './environment.validation';

describe('environment validation', () => {
  const jwtEnvironment = {
    JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  };

  it('accepts and converts valid configuration', () => {
    const result = validateEnvironment({
      ...jwtEnvironment,
      NODE_ENV: 'production',
      PORT: '8080',
      API_PREFIX: '/service/v1/',
    });

    expect(result).toMatchObject({
      NODE_ENV: 'production',
      PORT: 8080,
      API_PREFIX: 'service/v1',
      DATABASE_SSL: false,
    });
  });

  it('applies default values', () => {
    const result = validateEnvironment(jwtEnvironment);

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      API_PREFIX: 'api/v1',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_USER: 'postgres',
      DATABASE_PASSWORD: 'postgres',
      DATABASE_NAME: 'nestjs_challenge',
      DATABASE_TEST_NAME: 'nestjs_challenge_test',
      DATABASE_POOL_MAX: 10,
      DATABASE_SSL: false,
      JWT_EXPIRES_IN_SECONDS: 900,
    });
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, NODE_ENV: 'staging' }),
    ).toThrow('Environment validation failed');
  });

  it('rejects an invalid port type', () => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, PORT: 'not-a-port' }),
    ).toThrow('Environment validation failed');
  });

  it.each([0, 65536])('rejects out-of-range port %s', (port) => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, PORT: port }),
    ).toThrow('Environment validation failed');
  });

  it('rejects an empty API prefix', () => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, API_PREFIX: '   ' }),
    ).toThrow('Environment validation failed');
  });

  it('normalizes leading and trailing slashes', () => {
    expect(normalizeApiPrefix('///api/v1///')).toBe('api/v1');
  });

  it('rejects a prefix containing only slashes', () => {
    expect(() => normalizeApiPrefix('///')).toThrow(
      'API_PREFIX must contain at least one non-slash character',
    );
  });

  it.each([
    ['true', true],
    ['false', false],
    [true, true],
    [false, false],
  ])('parses DATABASE_SSL value %s explicitly', (input, expected) => {
    expect(
      validateEnvironment({ ...jwtEnvironment, DATABASE_SSL: input })
        .DATABASE_SSL,
    ).toBe(expected);
  });

  it('rejects an arbitrary DATABASE_SSL string', () => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, DATABASE_SSL: 'enabled' }),
    ).toThrow('Environment validation failed');
  });

  it('rejects an out-of-range database port', () => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, DATABASE_PORT: 65536 }),
    ).toThrow('Environment validation failed');
  });

  it('rejects an out-of-range pool limit', () => {
    expect(() =>
      validateEnvironment({ ...jwtEnvironment, DATABASE_POOL_MAX: 51 }),
    ).toThrow('Environment validation failed');
  });

  it('rejects equal development and test database names in test mode', () => {
    expect(() =>
      validateEnvironment({
        ...jwtEnvironment,
        NODE_ENV: 'test',
        DATABASE_NAME: 'same_database',
        DATABASE_TEST_NAME: 'same_database',
      }),
    ).toThrow('DATABASE_TEST_NAME must differ from DATABASE_NAME');
  });

  it('rejects a missing or short JWT secret', () => {
    expect(() => validateEnvironment({})).toThrow(
      'Environment validation failed',
    );
    expect(() => validateEnvironment({ JWT_SECRET: 'too-short' })).toThrow(
      'Environment validation failed',
    );
  });

  it('parses a valid JWT expiration', () => {
    expect(
      validateEnvironment({
        ...jwtEnvironment,
        JWT_EXPIRES_IN_SECONDS: '1200',
      }).JWT_EXPIRES_IN_SECONDS,
    ).toBe(1200);
  });

  it.each(['later', 0, -1, 86401])(
    'rejects invalid JWT expiration %s',
    (expiration) => {
      expect(() =>
        validateEnvironment({
          ...jwtEnvironment,
          JWT_EXPIRES_IN_SECONDS: expiration,
        }),
      ).toThrow('Environment validation failed');
    },
  );
});
