import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function configureApplication(
  app: INestApplication,
  configService: ConfigService,
): void {
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  app.setGlobalPrefix(apiPrefix);
}
