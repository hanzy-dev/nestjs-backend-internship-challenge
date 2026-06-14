import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { bearer } from './auth-test-client';
import { parseJson } from './response-parser';

export interface ProjectTestResponse {
  id: string;
  name: string;
  status: string;
}

export interface TaskTestResponse {
  id: string;
  projectId: string;
  title: string;
  status: string;
  priority: string;
}

export async function createProject(
  app: NestExpressApplication,
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<ProjectTestResponse> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/projects')
    .set(bearer(token))
    .send({
      name: 'Example Project',
      description: 'Project description',
      status: 'active',
      ...overrides,
    })
    .expect(201);
  return parseJson<ProjectTestResponse>(response.text);
}

export async function createTask(
  app: NestExpressApplication,
  token: string,
  projectId: string,
  overrides: Record<string, unknown> = {},
): Promise<TaskTestResponse> {
  const response = await request(app.getHttpServer())
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set(bearer(token))
    .send({
      title: 'Example Task',
      status: 'todo',
      priority: 'medium',
      ...overrides,
    })
    .expect(201);
  return parseJson<TaskTestResponse>(response.text);
}
