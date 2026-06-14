import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { parseJson } from './response-parser';

export interface TestIdentity {
  userId: string;
  token: string;
  email: string;
}

export async function createTestIdentity(
  app: NestExpressApplication,
  suffix: string,
): Promise<TestIdentity> {
  const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const email = `${safeSuffix}@example.com`;
  const registration = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      name: `User ${safeSuffix}`,
      email,
      password: 'correct-password',
    })
    .expect(201);
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: 'correct-password' })
    .expect(200);
  const registrationBody = parseJson<{ id: string }>(registration.text);
  const loginBody = parseJson<{ accessToken: string }>(login.text);

  return {
    userId: registrationBody.id,
    token: loginBody.accessToken,
    email,
  };
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
