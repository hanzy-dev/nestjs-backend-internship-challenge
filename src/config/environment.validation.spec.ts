import {
  normalizeApiPrefix,
  validateEnvironment,
} from './environment.validation';

describe('environment validation', () => {
  it('accepts and converts valid configuration', () => {
    const result = validateEnvironment({
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
    const result = validateEnvironment({});

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
    });
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'staging' })).toThrow(
      'Environment validation failed',
    );
  });

  it('rejects an invalid port type', () => {
    expect(() => validateEnvironment({ PORT: 'not-a-port' })).toThrow(
      'Environment validation failed',
    );
  });

  it.each([0, 65536])('rejects out-of-range port %s', (port) => {
    expect(() => validateEnvironment({ PORT: port })).toThrow(
      'Environment validation failed',
    );
  });

  it('rejects an empty API prefix', () => {
    expect(() => validateEnvironment({ API_PREFIX: '   ' })).toThrow(
      'Environment validation failed',
    );
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
    expect(validateEnvironment({ DATABASE_SSL: input }).DATABASE_SSL).toBe(
      expected,
    );
  });

  it('rejects an arbitrary DATABASE_SSL string', () => {
    expect(() => validateEnvironment({ DATABASE_SSL: 'enabled' })).toThrow(
      'Environment validation failed',
    );
  });

  it('rejects an out-of-range database port', () => {
    expect(() => validateEnvironment({ DATABASE_PORT: 65536 })).toThrow(
      'Environment validation failed',
    );
  });

  it('rejects an out-of-range pool limit', () => {
    expect(() => validateEnvironment({ DATABASE_POOL_MAX: 51 })).toThrow(
      'Environment validation failed',
    );
  });

  it('rejects equal development and test database names in test mode', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        DATABASE_NAME: 'same_database',
        DATABASE_TEST_NAME: 'same_database',
      }),
    ).toThrow('DATABASE_TEST_NAME must differ from DATABASE_NAME');
  });
});
