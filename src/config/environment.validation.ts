import Joi from 'joi';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  API_PREFIX: string;
}

const environmentSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string().trim().min(1).default('api/v1'),
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
    typeof value.API_PREFIX !== 'string'
  ) {
    throw new Error('Environment validation failed: unexpected schema output');
  }

  return {
    ...value,
    NODE_ENV: value.NODE_ENV,
    PORT: value.PORT,
    API_PREFIX: normalizeApiPrefix(value.API_PREFIX),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeEnvironment(value: unknown): value is NodeEnvironment {
  return value === 'development' || value === 'test' || value === 'production';
}
