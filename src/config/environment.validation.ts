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
}

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
    typeof value.DATABASE_SSL !== 'boolean'
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
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeEnvironment(value: unknown): value is NodeEnvironment {
  return value === 'development' || value === 'test' || value === 'production';
}
