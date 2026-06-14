import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, createTestIdentity } from './helpers/auth-test-client';
import { cleanTestDatabase } from './helpers/database-cleaner';
import { createDatabaseTestApplication } from './helpers/create-test-app';
import { runTestMigrations } from './helpers/database-migrations';
import { createProject, createTask } from './helpers/resource-test-client';
import { parseJson } from './helpers/response-parser';

interface ProjectListBody {
  data: Array<{ name: string; status: string }>;
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ProjectDetailBody {
  tasks: Array<{ title: string }>;
}

describe('Projects (e2e)', () => {
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

  it('creates a safe Project using the authenticated owner', async () => {
    const identity = await createTestIdentity(app, 'project-create');
    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set(bearer(identity.token))
      .send({
        name: '  Launch API  ',
        description: '  Complete Project CRUD  ',
        status: 'active',
        dueDate: '2026-07-01T00:00:00.000Z',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Launch API',
      description: 'Complete Project CRUD',
      status: 'active',
      dueDate: '2026-07-01T00:00:00.000Z',
    });
    expect(response.body).not.toHaveProperty('ownerId');
    expect(response.body).not.toHaveProperty('owner');
  });

  it.each([
    ['invalid DTO', { name: '', status: 'unknown' }],
    ['unknown property', { name: 'Project', ownerId: crypto.randomUUID() }],
  ])('rejects %s', async (_case, body) => {
    const identity = await createTestIdentity(app, `project-${_case}`);
    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set(bearer(identity.token))
      .send(body)
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      path: '/api/v1/projects',
    });
  });

  it('requires a valid JWT', async () => {
    await request(app.getHttpServer()).get('/api/v1/projects').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('lists only the authenticated user Projects with pagination', async () => {
    const owner = await createTestIdentity(app, 'project-owner');
    const other = await createTestIdentity(app, 'project-other');
    await createProject(app, owner.token, { name: 'Zulu', status: 'active' });
    await createProject(app, owner.token, {
      name: 'Alpha',
      status: 'completed',
    });
    await createProject(app, other.token, { name: 'Private' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/projects?page=1&limit=1&sortBy=name&sortOrder=asc')
      .set(bearer(owner.token))
      .expect(200);
    const body = parseJson<ProjectListBody>(response.text);

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.name).toBe('Alpha');
    expect(body.meta).toEqual({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });
    expect(JSON.stringify(response.body)).not.toContain('Private');
  });

  it('filters Projects by status', async () => {
    const identity = await createTestIdentity(app, 'project-filter');
    await createProject(app, identity.token, { status: 'active' });
    await createProject(app, identity.token, {
      name: 'Completed',
      status: 'completed',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/projects?status=completed')
      .set(bearer(identity.token))
      .expect(200);
    const body = parseJson<ProjectListBody>(response.text);

    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.status).toBe('completed');
  });

  it('returns Project Detail with deterministically ordered Tasks', async () => {
    const identity = await createTestIdentity(app, 'project-detail');
    const project = await createProject(app, identity.token);
    const projectId = String(project.id);
    await createTask(app, identity.token, projectId, { title: 'First' });
    await createTask(app, identity.token, projectId, { title: 'Second' });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set(bearer(identity.token))
      .expect(200);
    const body = parseJson<ProjectDetailBody>(response.text);

    expect(body.tasks.map((task) => task.title)).toEqual(['First', 'Second']);
  });

  it('updates and deletes an owned Project', async () => {
    const identity = await createTestIdentity(app, 'project-mutate');
    const project = await createProject(app, identity.token, {
      dueDate: '2026-07-01T00:00:00.000Z',
    });
    const projectId = String(project.id);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set(bearer(identity.token))
      .send({
        name: 'Updated Project',
        status: 'completed',
        description: null,
        dueDate: null,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: 'Updated Project',
      status: 'completed',
      description: null,
      dueDate: null,
    });

    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set(bearer(identity.token))
      .expect(204);
    expect(deleted.text).toBe('');

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set(bearer(identity.token))
      .expect(404);
  });

  it.each([
    ['invalid UUID', 'not-a-uuid', 400, 'VALIDATION_ERROR'],
    ['missing Project', crypto.randomUUID(), 404, 'RESOURCE_NOT_FOUND'],
  ])(
    'returns the standard contract for %s',
    async (_case, id, status, code) => {
      const identity = await createTestIdentity(app, `project-${_case}`);
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${id}`)
        .set(bearer(identity.token))
        .expect(status);

      expect(response.body).toMatchObject({ statusCode: status, code });
    },
  );
});
