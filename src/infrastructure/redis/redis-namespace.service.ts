import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisNamespaceService {
  readonly base: string;
  readonly bullPrefix: string;

  constructor(configService: ConfigService) {
    const namespace = configService.getOrThrow<string>('REDIS_NAMESPACE');
    const environment = configService.getOrThrow<string>('NODE_ENV');
    this.base = `${namespace}:${environment}`;
    this.bullPrefix = `${this.base}:bull`;
  }

  projectDetail(userId: string, projectId: string): string {
    return `${this.base}:cache:project:${userId}:${projectId}`;
  }
}
