import { Global, Module } from '@nestjs/common';
import { RedisConnectionManager } from './redis-connection.manager';
import { RedisNamespaceService } from './redis-namespace.service';

@Global()
@Module({
  providers: [RedisConnectionManager, RedisNamespaceService],
  exports: [RedisConnectionManager, RedisNamespaceService],
})
export class RedisInfrastructureModule {}
