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
  data: Array<{ name: string }>;
}

interface ErrorBody {
  code: string;
}

describe('Ownership (e2e)', () => {
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

  it('does not expose another user Projects in lists', async () => {
    const userA = await createTestIdentity(app, 'owner-list-a');
    const userB = await createTestIdentity(app, 'owner-list-b');
    await createProject(app, userA.token, { name: 'User A Private' });
    await createProject(app, userB.token, { name: 'User B Project' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set(bearer(userB.token))
      .expect(200);
    const body = parseJson<ProjectListBody>(response.text);

    expect(body.data).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('User A Private');
  });

  it.each([
    ['read', 'get'],
    ['update', 'patch'],
    ['delete', 'delete'],
  ])(
    'returns not found when User B tries to %s User A Project',
    async (_case, method) => {
      const userA = await createTestIdentity(app, `owner-project-a-${_case}`);
      const userB = await createTestIdentity(app, `owner-project-b-${_case}`);
      const project = await createProject(app, userA.token);
      const builder = request(app.getHttpServer())
        [method as 'get' | 'patch' | 'delete'](`/api/v1/projects/${project.id}`)
        .set(bearer(userB.token));
      if (method === 'patch') builder.send({ name: 'Stolen' });

      const response = await builder.expect(404);
      expect(parseJson<ErrorBody>(response.text).code).toBe(
        'RESOURCE_NOT_FOUND',
      );
    },
  );

  it('blocks Task creation and listing under another user Project', async () => {
    const userA = await createTestIdentity(app, 'owner-task-parent-a');
    const userB = await createTestIdentity(app, 'owner-task-parent-b');
    const project = await createProject(app, userA.token);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${project.id}/tasks`)
      .set(bearer(userB.token))
      .send({ title: 'Unauthorized Task' })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${project.id}/tasks`)
      .set(bearer(userB.token))
      .expect(404);
  });

  it.each([
    ['read', 'get'],
    ['update', 'patch'],
    ['delete', 'delete'],
  ])(
    'returns not found when User B tries to %s User A Task',
    async (_case, method) => {
      const userA = await createTestIdentity(app, `owner-task-a-${_case}`);
      const userB = await createTestIdentity(app, `owner-task-b-${_case}`);
      const project = await createProject(app, userA.token);
      const task = await createTask(app, userA.token, String(project.id));
      const builder = request(app.getHttpServer())
        [
          method as 'get' | 'patch' | 'delete'
        ](`/api/v1/projects/${project.id}/tasks/${task.id}`)
        .set(bearer(userB.token));
      if (method === 'patch') builder.send({ title: 'Stolen' });

      const response = await builder.expect(404);
      expect(parseJson<ErrorBody>(response.text).code).toBe(
        'RESOURCE_NOT_FOUND',
      );
    },
  );
});
