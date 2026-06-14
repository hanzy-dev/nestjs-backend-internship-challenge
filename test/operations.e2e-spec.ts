import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { cleanTestDatabase } from './helpers/database-cleaner';
import { createDatabaseTestApplication } from './helpers/create-test-app';
import { runTestMigrations } from './helpers/database-migrations';
import { parseJson } from './helpers/response-parser';

interface ErrorBody {
  statusCode: number;
  code: string;
  requestId: string;
}

describe('Operational foundation (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const testApplication = await createDatabaseTestApplication();
    app = testApplication.app;
    dataSource = testApplication.dataSource;
    await runTestMigrations(dataSource);
  });

  beforeEach(async () => {
    await cleanTestDatabase(dataSource);
  });

  afterAll(async () => {
    await cleanTestDatabase(dataSource);
    await app.close();
    expect(dataSource.isInitialized).toBe(false);
  });

  it('propagates a valid request ID through header and error body', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/projects/not-a-uuid')
      .set('X-Request-ID', 'client-request-123')
      .expect(401);
    const body = parseJson<ErrorBody>(response.text);

    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(body.requestId).toBe('client-request-123');
  });

  it('replaces an unsafe request ID with a UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-ID', 'x'.repeat(129))
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('sets Helmet headers and allows only configured CORS origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://allowed.example')
      .expect(200);
    const rejected = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://rejected.example')
      .expect(200);

    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://allowed.example',
    );
    expect(rejected.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('rejects request bodies above the configured limit', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Large Payload',
        email: 'large@example.com',
        password: 'correct-password',
        padding: 'x'.repeat(12000),
      })
      .expect(413);
  });

  it('throttles login without throttling unrelated endpoints', async () => {
    for (let index = 0; index < 100; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `missing-${index}@example.com`,
          password: 'correct-password',
        })
        .expect(401);
    }

    const throttled = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'missing-final@example.com',
        password: 'correct-password',
      })
      .expect(429);
    expect(parseJson<ErrorBody>(throttled.text).code).toBe('TOO_MANY_REQUESTS');

    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('reports liveness and PostgreSQL readiness publicly', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok' });
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200, { status: 'ready', database: 'up' });
  });
});
