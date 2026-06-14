import {
  ClassSerializerInterceptor,
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { formatValidationErrors, ValidationException } from './common/errors';

export function configureApplication(
  app: INestApplication,
  configService: ConfigService,
): void {
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const requestIdMiddleware = new RequestIdMiddleware();

  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.use(helmet());
  app.enableCors({
    credentials: true,
    origin: configService.getOrThrow<string[]>('CORS_ORIGINS'),
  });
  const expressApp = app as NestExpressApplication;
  const bodyLimit = configService.getOrThrow<string>('REQUEST_BODY_LIMIT');
  expressApp.useBodyParser('json', { limit: bodyLimit });
  expressApp.useBodyParser('urlencoded', {
    limit: bodyLimit,
    extended: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (errors) =>
        new ValidationException(formatValidationErrors(errors)),
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(resolveExceptionFilter(app));
}

function resolveExceptionFilter(app: INestApplication): GlobalExceptionFilter {
  try {
    return app.get(GlobalExceptionFilter);
  } catch {
    return new GlobalExceptionFilter();
  }
}
