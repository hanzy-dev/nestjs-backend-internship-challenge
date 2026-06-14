import { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';

export const PINO_REDACT_PATHS = [
  'request.headers.authorization',
  'request.headers.cookie',
  'request.body.password',
  'request.body.passwordHash',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.passwordHash',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.accessToken',
  '*.JWT_SECRET',
  '*.DATABASE_PASSWORD',
  '*.REDIS_PASSWORD',
];

export function createPinoConfiguration(configService: ConfigService): Params {
  const pretty = configService.getOrThrow<boolean>('LOG_PRETTY');
  const nodeEnv = configService.getOrThrow<string>('NODE_ENV');

  return {
    pinoHttp: {
      enabled: nodeEnv !== 'test',
      level: configService.getOrThrow<string>('LOG_LEVEL'),
      redact: {
        paths: PINO_REDACT_PATHS,
        censor: '[REDACTED]',
      },
      transport:
        pretty && nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
      customProps: (request) => ({
        requestId: readNestedString(request, ['id']),
        method: readNestedString(request, ['method']),
        route: readRouteTemplate(request),
        userId: readNestedString(request, ['user', 'id']),
      }),
      customSuccessObject: (request, response) =>
        createHttpLogFields(request, response),
      customErrorObject: (request, response) =>
        createHttpLogFields(request, response),
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        responseTime: 'durationMs',
      },
    },
  };
}

export function createHttpLogFields(
  request: unknown,
  response: unknown,
): {
  method: string | undefined;
  route: string | undefined;
  statusCode: number | undefined;
  errorCode: string | undefined;
} {
  return {
    method: readNestedString(request, ['method']),
    route: readRouteTemplate(request),
    statusCode: readNestedNumber(response, ['statusCode']),
    errorCode: readNestedString(response, ['locals', 'errorCode']),
  };
}

function readNestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value;

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

function readNestedNumber(value: unknown, path: string[]): number | undefined {
  let current: unknown = value;

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'number' ? current : undefined;
}

function readRouteTemplate(value: unknown): string | undefined {
  return readNestedString(value, ['route', 'path']);
}
