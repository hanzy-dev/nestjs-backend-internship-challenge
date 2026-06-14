import Joi from 'joi';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  API_PREFIX: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_TEST_NAME: string;
  DATABASE_POOL_MAX: number;
  DATABASE_SSL: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  LOG_LEVEL: string;
  LOG_PRETTY: boolean;
  CORS_ORIGINS: string[];
  REQUEST_BODY_LIMIT: string;
  AUTH_THROTTLE_LIMIT: number;
  AUTH_THROTTLE_TTL_SECONDS: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_TLS: boolean;
  REDIS_CONNECT_TIMEOUT_MS: number;
  REDIS_NAMESPACE: string;
  CACHE_ENABLED: boolean;
  CACHE_TTL_SECONDS: number;
  QUEUE_ENABLED: boolean;
}

const explicitBoolean = Joi.boolean().truthy('true').falsy('false');

const environmentSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string().trim().min(1).default('api/v1'),
  DATABASE_HOST: Joi.string().trim().min(1).default('localhost'),
  DATABASE_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  DATABASE_USER: Joi.string().trim().min(1).default('postgres'),
  DATABASE_PASSWORD: Joi.string().min(1).default('postgres'),
  DATABASE_NAME: Joi.string().trim().min(1).default('nestjs_challenge'),
  DATABASE_TEST_NAME: Joi.string()
    .trim()
    .min(1)
    .default('nestjs_challenge_test'),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).max(50).default(10),
  DATABASE_SSL: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .sensitive()
    .default(false),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().integer().min(1).max(86400).default(900),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  LOG_PRETTY: explicitBoolean.default(false),
  CORS_ORIGINS: Joi.string().trim().min(1).default('http://localhost:3000'),
  REQUEST_BODY_LIMIT: Joi.string()
    .trim()
    .pattern(/^\d+(kb|mb)$/i)
    .default('100kb'),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().min(1).max(1000).default(10),
  AUTH_THROTTLE_TTL_SECONDS: Joi.number()
    .integer()
    .min(1)
    .max(3600)
    .default(60),
  REDIS_HOST: Joi.string().trim().min(1).default('localhost'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TLS: explicitBoolean.default(false),
  REDIS_CONNECT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(30000)
    .default(2000),
  REDIS_NAMESPACE: Joi.string()
    .trim()
    .pattern(/^[a-z0-9][a-z0-9-]*$/)
    .default('nestjs-challenge'),
  CACHE_ENABLED: explicitBoolean.default(false),
  CACHE_TTL_SECONDS: Joi.number().integer().min(1).max(86400).default(300),
  QUEUE_ENABLED: explicitBoolean.default(false),
}).unknown(true);

export function normalizeApiPrefix(prefix: string): string {
  const normalized = prefix.trim().replace(/^\/+|\/+$/g, '');

  if (normalized.length === 0) {
    throw new Error('API_PREFIX must contain at least one non-slash character');
  }

  return normalized;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables & Record<string, unknown> {
  const validationResult = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (validationResult.error) {
    throw new Error(
      `Environment validation failed: ${validationResult.error.message}`,
    );
  }

  const value: unknown = validationResult.value;

  if (
    !isRecord(value) ||
    !isNodeEnvironment(value.NODE_ENV) ||
    typeof value.PORT !== 'number' ||
    typeof value.API_PREFIX !== 'string' ||
    typeof value.DATABASE_HOST !== 'string' ||
    typeof value.DATABASE_PORT !== 'number' ||
    typeof value.DATABASE_USER !== 'string' ||
    typeof value.DATABASE_PASSWORD !== 'string' ||
    typeof value.DATABASE_NAME !== 'string' ||
    typeof value.DATABASE_TEST_NAME !== 'string' ||
    typeof value.DATABASE_POOL_MAX !== 'number' ||
    typeof value.DATABASE_SSL !== 'boolean' ||
    typeof value.JWT_SECRET !== 'string' ||
    typeof value.JWT_EXPIRES_IN_SECONDS !== 'number' ||
    typeof value.LOG_LEVEL !== 'string' ||
    typeof value.LOG_PRETTY !== 'boolean' ||
    typeof value.CORS_ORIGINS !== 'string' ||
    typeof value.REQUEST_BODY_LIMIT !== 'string' ||
    typeof value.AUTH_THROTTLE_LIMIT !== 'number' ||
    typeof value.AUTH_THROTTLE_TTL_SECONDS !== 'number' ||
    typeof value.REDIS_HOST !== 'string' ||
    typeof value.REDIS_PORT !== 'number' ||
    typeof value.REDIS_PASSWORD !== 'string' ||
    typeof value.REDIS_TLS !== 'boolean' ||
    typeof value.REDIS_CONNECT_TIMEOUT_MS !== 'number' ||
    typeof value.REDIS_NAMESPACE !== 'string' ||
    typeof value.CACHE_ENABLED !== 'boolean' ||
    typeof value.CACHE_TTL_SECONDS !== 'number' ||
    typeof value.QUEUE_ENABLED !== 'boolean'
  ) {
    throw new Error('Environment validation failed: unexpected schema output');
  }

  if (
    value.NODE_ENV === 'test' &&
    value.DATABASE_TEST_NAME === value.DATABASE_NAME
  ) {
    throw new Error(
      'Environment validation failed: DATABASE_TEST_NAME must differ from DATABASE_NAME',
    );
  }

  return {
    ...value,
    NODE_ENV: value.NODE_ENV,
    PORT: value.PORT,
    API_PREFIX: normalizeApiPrefix(value.API_PREFIX),
    DATABASE_HOST: value.DATABASE_HOST,
    DATABASE_PORT: value.DATABASE_PORT,
    DATABASE_USER: value.DATABASE_USER,
    DATABASE_PASSWORD: value.DATABASE_PASSWORD,
    DATABASE_NAME: value.DATABASE_NAME,
    DATABASE_TEST_NAME: value.DATABASE_TEST_NAME,
    DATABASE_POOL_MAX: value.DATABASE_POOL_MAX,
    DATABASE_SSL: value.DATABASE_SSL,
    JWT_SECRET: value.JWT_SECRET,
    JWT_EXPIRES_IN_SECONDS: value.JWT_EXPIRES_IN_SECONDS,
    LOG_LEVEL: value.LOG_LEVEL,
    LOG_PRETTY: value.LOG_PRETTY,
    CORS_ORIGINS: parseCorsOrigins(value.CORS_ORIGINS),
    REQUEST_BODY_LIMIT: value.REQUEST_BODY_LIMIT.toLowerCase(),
    AUTH_THROTTLE_LIMIT: value.AUTH_THROTTLE_LIMIT,
    AUTH_THROTTLE_TTL_SECONDS: value.AUTH_THROTTLE_TTL_SECONDS,
    REDIS_HOST: value.REDIS_HOST,
    REDIS_PORT: value.REDIS_PORT,
    REDIS_PASSWORD: value.REDIS_PASSWORD,
    REDIS_TLS: value.REDIS_TLS,
    REDIS_CONNECT_TIMEOUT_MS: value.REDIS_CONNECT_TIMEOUT_MS,
    REDIS_NAMESPACE: value.REDIS_NAMESPACE,
    CACHE_ENABLED: value.CACHE_ENABLED,
    CACHE_TTL_SECONDS: value.CACHE_TTL_SECONDS,
    QUEUE_ENABLED: value.QUEUE_ENABLED,
  };
}

function parseCorsOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0 || origins.includes('*')) {
    throw new Error(
      'Environment validation failed: CORS_ORIGINS must contain explicit origins',
    );
  }

  for (const origin of origins) {
    const parsed = new URL(origin);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new Error(
        'Environment validation failed: CORS_ORIGINS contains an invalid origin',
      );
    }
  }

  return [...new Set(origins)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeEnvironment(value: unknown): value is NodeEnvironment {
  return value === 'development' || value === 'test' || value === 'production';
}
