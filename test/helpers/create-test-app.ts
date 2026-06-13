import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/app.setup';

export interface DatabaseTestApplication {
  app: NestExpressApplication;
  dataSource: DataSource;
}

export async function createDatabaseTestApplication(): Promise<DatabaseTestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  configureApplication(app, app.get(ConfigService));
  await app.init();

  return {
    app,
    dataSource: app.get(DataSource),
  };
}
