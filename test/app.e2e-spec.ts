import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { runTestMigrations } from './helpers/database-migrations';
import { createDatabaseTestApplication } from './helpers/create-test-app';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const testApplication = await createDatabaseTestApplication();
    app = testApplication.app;
    await runTestMigrations(testApplication.dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect({
      name: 'NestJS Backend Internship Challenge',
      status: 'Batch 1 - Bootstrap and configuration',
      version: 'v1',
    });
  });
});
