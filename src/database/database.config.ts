import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import {
  EnvironmentVariables,
  NodeEnvironment,
} from '../config/environment.validation';
import { databaseEntities } from './database.entities';

export interface DatabaseSettings {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  user: string;
  password: string;
  developmentName: string;
  testName: string;
  poolMax: number;
  ssl: boolean;
}

export function getDatabaseSettings(
  configService: ConfigService,
): DatabaseSettings {
  return {
    nodeEnv: configService.getOrThrow<NodeEnvironment>('NODE_ENV'),
    host: configService.getOrThrow<string>('DATABASE_HOST'),
    port: configService.getOrThrow<number>('DATABASE_PORT'),
    user: configService.getOrThrow<string>('DATABASE_USER'),
    password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
    developmentName: configService.getOrThrow<string>('DATABASE_NAME'),
    testName: configService.getOrThrow<string>('DATABASE_TEST_NAME'),
    poolMax: configService.getOrThrow<number>('DATABASE_POOL_MAX'),
    ssl: configService.getOrThrow<boolean>('DATABASE_SSL'),
  };
}

export function getDatabaseSettingsFromEnvironment(
  environment: EnvironmentVariables,
): DatabaseSettings {
  return {
    nodeEnv: environment.NODE_ENV,
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    user: environment.DATABASE_USER,
    password: environment.DATABASE_PASSWORD,
    developmentName: environment.DATABASE_NAME,
    testName: environment.DATABASE_TEST_NAME,
    poolMax: environment.DATABASE_POOL_MAX,
    ssl: environment.DATABASE_SSL,
  };
}

export function buildDataSourceOptions(
  settings: DatabaseSettings,
): DataSourceOptions {
  const database =
    settings.nodeEnv === 'test' ? settings.testName : settings.developmentName;

  if (
    settings.nodeEnv === 'test' &&
    settings.testName === settings.developmentName
  ) {
    throw new Error('Test database must differ from development database');
  }

  return {
    type: 'postgres',
    host: settings.host,
    port: settings.port,
    username: settings.user,
    password: settings.password,
    database,
    entities: [...databaseEntities],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsRun: false,
    logging: false,
    ssl: settings.ssl ? { rejectUnauthorized: true } : false,
    extra: {
      max: settings.poolMax,
    },
  };
}
