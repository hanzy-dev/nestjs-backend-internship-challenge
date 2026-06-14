import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, createTestIdentity } from './helpers/auth-test-client';
import { cleanTestDatabase } from './helpers/database-cleaner';
import { createDatabaseTestApplication } from './helpers/create-test-app';
import { runTestMigrations } from './helpers/database-migrations';
import { createProject, createTask } from './helpers/resource-test-client';
import { parseJson } from './helpers/response-parser';

interface TaskListBody {
  data: Array<{ title: string }>;
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ErrorBody {
  code: string;
  message: string;
}

describe('Tasks (e2e)', () => {
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

  it('creates, reads, updates, and deletes a Task under an owned Project', async () => {
    const identity = await createTestIdentity(app, 'task-crud');
    const project = await createProject(app, identity.token);
    const projectId = String(project.id);
    const created = await createTask(app, identity.token, projectId, {
      title: '  Implement endpoint  ',
      priority: 'high',
      description: 'Temporary description',
      dueDate: '2026-07-01T00:00:00.000Z',
    });
    const taskId = String(created.id);
    expect(created).toMatchObject({
      projectId,
      title: 'Implement endpoint',
      priority: 'high',
    });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set(bearer(identity.token))
      .expect(200);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set(bearer(identity.token))
      .send({
        status: 'done',
        priority: 'low',
        description: null,
        dueDate: null,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      status: 'done',
      priority: 'low',
      description: null,
      dueDate: null,
    });

    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set(bearer(identity.token))
      .expect(204);
    expect(deleted.text).toBe('');
  });

  it('filters, paginates, and sorts Tasks', async () => {
    const identity = await createTestIdentity(app, 'task-list');
    const project = await createProject(app, identity.token);
    const projectId = String(project.id);
    await createTask(app, identity.token, projectId, {
      title: 'Zulu',
      status: 'todo',
      priority: 'low',
    });
    await createTask(app, identity.token, projectId, {
      title: 'Alpha',
      status: 'done',
      priority: 'high',
    });
    await createTask(app, identity.token, projectId, {
      title: 'Beta',
      status: 'done',
      priority: 'high',
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/projects/${projectId}/tasks?status=done&priority=high&page=1&limit=1&sortBy=title&sortOrder=asc`,
      )
      .set(bearer(identity.token))
      .expect(200);
    const body = parseJson<TaskListBody>(response.text);

    expect(body.data[0]?.title).toBe('Alpha');
    expect(body.meta).toEqual({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });
  });

  it.each([
    [
      'unknown Project',
      crypto.randomUUID(),
      crypto.randomUUID(),
      'Project not found',
    ],
    ['unknown Task', null, crypto.randomUUID(), 'Task not found'],
  ])('rejects %s', async (_case, requestedProject, taskId, message) => {
    const identity = await createTestIdentity(app, `task-${_case}`);
    const project = await createProject(app, identity.token);
    const projectId = requestedProject ?? String(project.id);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set(bearer(identity.token))
      .expect(404);
    expect(parseJson<ErrorBody>(response.text)).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      message,
    });
  });

  it('rejects a Task accessed through an unrelated Project', async () => {
    const identity = await createTestIdentity(app, 'task-mismatch');
    const projectA = await createProject(app, identity.token, { name: 'A' });
    const projectB = await createProject(app, identity.token, { name: 'B' });
    const task = await createTask(app, identity.token, String(projectA.id));

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectB.id}/tasks/${task.id}`)
      .set(bearer(identity.token))
      .expect(404);
  });

  it('rejects an invalid Project or Task UUID', async () => {
    const identity = await createTestIdentity(app, 'task-invalid-uuid');

    await request(app.getHttpServer())
      .get('/api/v1/projects/not-a-uuid/tasks')
      .set(bearer(identity.token))
      .expect(400);

    const project = await createProject(app, identity.token);
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${project.id}/tasks/not-a-uuid`)
      .set(bearer(identity.token))
      .expect(400);
  });

  it.each([
    ['invalid DTO', { title: '', priority: 'urgent' }],
    ['unknown property', { title: 'Task', projectId: crypto.randomUUID() }],
  ])('rejects %s', async (_case, body) => {
    const identity = await createTestIdentity(app, `task-validation-${_case}`);
    const project = await createProject(app, identity.token);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/projects/${project.id}/tasks`)
      .set(bearer(identity.token))
      .send(body)
      .expect(400);
    expect(parseJson<ErrorBody>(response.text).code).toBe('VALIDATION_ERROR');
  });

  it('deleting a Project cascades its Tasks', async () => {
    const identity = await createTestIdentity(app, 'task-cascade');
    const project = await createProject(app, identity.token);
    await createTask(app, identity.token, String(project.id));

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${project.id}`)
      .set(bearer(identity.token))
      .expect(204);

    const rows: unknown = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM tasks WHERE project_id = $1',
      [project.id],
    );
    expect(rows).toEqual([{ count: 0 }]);
  });
});
