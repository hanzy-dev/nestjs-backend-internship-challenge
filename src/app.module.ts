import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, validateEnvironment } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { createPinoConfiguration } from './common/logging/pino.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HealthModule } from './health/health.module';
import { RedisInfrastructureModule } from './infrastructure/redis/redis-infrastructure.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoConfiguration,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl:
            configService.getOrThrow<number>('AUTH_THROTTLE_TTL_SECONDS') *
            1000,
          limit: configService.getOrThrow<number>('AUTH_THROTTLE_LIMIT'),
        },
      ],
    }),
    DatabaseModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    HealthModule,
    RedisInfrastructureModule,
  ],
  controllers: [AppController],
  providers: [AppService, GlobalExceptionFilter],
})
export class AppModule {}
