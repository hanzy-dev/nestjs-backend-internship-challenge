import { ConfigService } from '@nestjs/config';

export interface JwtConfiguration {
  secret: string;
  expiresInSeconds: number;
}

export function getJwtConfiguration(
  configService: ConfigService,
): JwtConfiguration {
  return {
    secret: configService.getOrThrow<string>('JWT_SECRET'),
    expiresInSeconds: configService.getOrThrow<number>(
      'JWT_EXPIRES_IN_SECONDS',
    ),
  };
}
