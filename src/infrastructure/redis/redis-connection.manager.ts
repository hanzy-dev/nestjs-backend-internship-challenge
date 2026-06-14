import {
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RedisConnectionManager
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private cacheClient: Redis | null = null;
  private queueClient: Redis | null = null;
  private cacheClientPromise: Promise<Redis | null> | null = null;
  private queueClientPromise: Promise<Redis | null> | null = null;
  private shutdownPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RedisConnectionManager.name);
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([this.ensureCacheClient(), this.ensureQueueClient()]);
  }

  getCacheClient(): Redis | null {
    return this.cacheClient;
  }

  getQueueClient(): Redis | null {
    return this.queueClient;
  }

  async ensureCacheClient(): Promise<Redis | null> {
    if (this.cacheClient) {
      return this.cacheClient;
    }
    if (!this.configService.getOrThrow<boolean>('CACHE_ENABLED')) {
      return null;
    }
    this.cacheClientPromise ??= this.connect('cache', 1).then((client) => {
      this.cacheClient = client;
      return client;
    });
    return this.cacheClientPromise;
  }

  async ensureQueueClient(): Promise<Redis | null> {
    if (this.queueClient) {
      return this.queueClient;
    }
    if (!this.configService.getOrThrow<boolean>('QUEUE_ENABLED')) {
      return null;
    }
    this.queueClientPromise ??= this.connect('queue', null).then((client) => {
      this.queueClient = client;
      return client;
    });
    return this.queueClientPromise;
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.shutdown();
  }

  private async connect(
    concern: 'cache' | 'queue',
    maxRetriesPerRequest: number | null,
  ): Promise<Redis | null> {
    const client = new Redis({
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: this.configService.getOrThrow<number>('REDIS_PORT'),
      password:
        this.configService.getOrThrow<string>('REDIS_PASSWORD') || undefined,
      tls: this.configService.getOrThrow<boolean>('REDIS_TLS') ? {} : undefined,
      connectTimeout: this.configService.getOrThrow<number>(
        'REDIS_CONNECT_TIMEOUT_MS',
      ),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest,
      retryStrategy: () => null,
    });
    client.on('error', () => undefined);

    try {
      await client.connect();
      await client.ping();
      return client;
    } catch (error) {
      this.logger.warn({ err: error, concern }, 'Redis connection unavailable');
      client.disconnect();
      return null;
    }
  }

  private async shutdown(): Promise<void> {
    this.shutdownPromise ??= (async () => {
      const clients = await Promise.all([
        this.cacheClientPromise ?? Promise.resolve(this.cacheClient),
        this.queueClientPromise ?? Promise.resolve(this.queueClient),
      ]);
      await Promise.all(clients.map((client) => this.close(client)));
      this.cacheClient = null;
      this.queueClient = null;
      this.cacheClientPromise = null;
      this.queueClientPromise = null;
    })();
    await this.shutdownPromise;
  }

  private async close(client: Redis | null): Promise<void> {
    if (!client) {
      return;
    }
    try {
      if (client.status === 'ready') {
        await client.quit();
      }
    } finally {
      if (client.status !== 'end') {
        client.disconnect();
      }
      client.removeAllListeners();
    }
  }
}
