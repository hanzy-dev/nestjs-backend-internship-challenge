import { ConfigService } from '@nestjs/config';
import {
  createHttpLogFields,
  createPinoConfiguration,
  PINO_REDACT_PATHS,
} from './pino.config';

describe('Pino configuration', () => {
  it('redacts authentication and credential fields', () => {
    expect(PINO_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'request.headers.authorization',
        'request.headers.cookie',
        'request.body.password',
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        '*.passwordHash',
        '*.accessToken',
        '*.JWT_SECRET',
        '*.DATABASE_PASSWORD',
        '*.REDIS_PASSWORD',
      ]),
    );
  });

  it('keeps test HTTP logging disabled', () => {
    const config = createPinoConfiguration(
      new ConfigService({
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
        LOG_PRETTY: false,
      }),
    );

    expect(config.pinoHttp).toMatchObject({ enabled: false });
  });

  it('adds request correlation and stable HTTP completion fields', () => {
    expect(
      createHttpLogFields(
        {
          method: 'GET',
          route: { path: '/api/v1/projects/:projectId' },
        },
        {
          statusCode: 404,
          locals: { errorCode: 'RESOURCE_NOT_FOUND' },
        },
      ),
    ).toMatchObject({
      method: 'GET',
      route: '/api/v1/projects/:projectId',
      statusCode: 404,
      errorCode: 'RESOURCE_NOT_FOUND',
    });
  });
});
