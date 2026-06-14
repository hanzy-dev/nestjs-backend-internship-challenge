import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createDatabaseTestApplication } from './helpers/create-test-app';
import { parseJson } from './helpers/response-parser';

interface OpenApiDocument {
  openapi: string;
  paths: Record<
    string,
    Record<string, { security?: Array<Record<string, string[]>> }>
  >;
  components?: {
    securitySchemes?: Record<string, { scheme?: string; type?: string }>;
    schemas?: Record<string, unknown>;
  };
}

describe('Swagger/OpenAPI documentation (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const testApplication = await createDatabaseTestApplication();
    app = testApplication.app;
    dataSource = testApplication.dataSource;
  });

  afterAll(async () => {
    await app.close();
    expect(dataSource.isInitialized).toBe(false);
  });

  it('serves Swagger UI and an accurate OpenAPI document', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const document = parseJson<OpenApiDocument>(response.text);

    expect(document.openapi).toMatch(/^3\./);
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        'RegisterDto',
        'LoginDto',
        'ProjectResponseModel',
        'ProjectDetailResponseModel',
        'TaskResponseModel',
        'ApiErrorResponseModel',
      ]),
    );
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/me',
        '/api/v1/projects',
        '/api/v1/projects/{projectId}',
        '/api/v1/projects/{projectId}/tasks',
        '/api/v1/projects/{projectId}/tasks/{taskId}',
        '/health',
        '/health/ready',
      ]),
    );
    expect(document.paths['/api/v1/projects']?.get?.security).toContainEqual({
      bearer: [],
    });
    expect(response.text).not.toMatch(
      /replace-with-a-non-production-secret|correct-password|DATABASE_PASSWORD|REDIS_PASSWORD/,
    );
  });
});
