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
    });
  });

  it('applies default values', () => {
    const result = validateEnvironment({});

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      API_PREFIX: 'api/v1',
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
});
