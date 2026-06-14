import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApplication } from './app.setup';
import { configureSwagger } from './docs/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  configureApplication(app, configService);
  configureSwagger(app);
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const port = configService.getOrThrow<number>('app.port');
  await app.listen(port);
}

void bootstrap();
