import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../src/users/persistence/user.entity';
import { cleanTestDatabase } from './helpers/database-cleaner';
import { createDatabaseTestApplication } from './helpers/create-test-app';
import { runTestMigrations } from './helpers/database-migrations';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  path: string;
}

interface LoginBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

describe('Authentication (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let users: Repository<UserEntity>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApplication = await createDatabaseTestApplication();
    app = testApplication.app;
    dataSource = testApplication.dataSource;
    await runTestMigrations(dataSource);
    users = dataSource.getRepository(UserEntity);
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await cleanTestDatabase(dataSource);
  });

  afterAll(async () => {
    await cleanTestDatabase(dataSource);
    await app.close();
    expect(dataSource.isInitialized).toBe(false);
  });

  it('registers a normalized user with a real password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: ' Example User ',
        email: ' User@Example.COM ',
        password: 'correct-password',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Example User',
      email: 'user@example.com',
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');

    const stored = await users.findOneByOrFail({ email: 'user@example.com' });
    expect(stored.passwordHash).not.toBe('correct-password');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects duplicate normalized email with CONFLICT', async () => {
    await registerUser('User@Example.com');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(validRegistration(' user@example.COM '))
      .expect(409);

    assertError(
      response.text,
      409,
      'CONFLICT',
      'Email is already registered',
      '/api/v1/auth/register',
    );
  });

  it.each([
    ['invalid email', { ...validRegistration(), email: 'invalid' }, 'email'],
    [
      'short password',
      { ...validRegistration(), password: 'short' },
      'password',
    ],
    [
      'password beyond the bcrypt byte limit',
      { ...validRegistration(), password: 'é'.repeat(37) },
      'password',
    ],
    ['unknown property', { ...validRegistration(), role: 'admin' }, 'role'],
  ])('rejects %s with validation details', async (_case, body, field) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(body)
      .expect(400);
    const error = assertError(
      response.text,
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      '/api/v1/auth/register',
    );

    expect(JSON.stringify(error.details)).toContain(field);
    expect(JSON.stringify(error.details)).not.toContain(
      String(body.password ?? ''),
    );
  });

  it('logs in and returns a JWT with the User ID as subject', async () => {
    const user = await registerUser();
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: ' USER@EXAMPLE.COM ',
        password: 'correct-password',
      })
      .expect(200);
    const loginBody = parseLogin(response.text);

    expect(loginBody).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: user.id, email: 'user@example.com' },
    });
    expect(loginBody.user).not.toHaveProperty('passwordHash');

    const payload: unknown = jwtService.decode(loginBody.accessToken);
    expect(isRecord(payload) && payload.sub).toBe(user.id);
  });

  it('uses the same safe response for unknown email and wrong password', async () => {
    await registerUser();
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password: 'correct-password' })
      .expect(401);
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' })
      .expect(401);

    const unknownError = assertError(
      unknown.text,
      401,
      'UNAUTHENTICATED',
      'Invalid email or password',
      '/api/v1/auth/login',
    );
    const wrongError = assertError(
      wrong.text,
      401,
      'UNAUTHENTICATED',
      'Invalid email or password',
      '/api/v1/auth/login',
    );
    expect(unknownError.message).toBe(wrongError.message);
  });

  it.each([
    ['missing token', undefined],
    ['malformed token', 'Bearer malformed-token'],
  ])('rejects %s', async (_case, authorization) => {
    const requestBuilder = request(app.getHttpServer()).get('/api/v1/auth/me');
    if (authorization) {
      requestBuilder.set('Authorization', authorization);
    }
    const response = await requestBuilder.expect(401);

    assertError(
      response.text,
      401,
      'UNAUTHENTICATED',
      'Unauthorized',
      '/api/v1/auth/me',
    );
  });

  it('rejects invalidly signed, expired, and missing-user tokens', async () => {
    const invalid = await new JwtService({
      secret: 'different-test-secret-with-at-least-32-characters',
    }).signAsync({ sub: randomUUID() });
    const expired = await jwtService.signAsync(
      { sub: randomUUID() },
      { expiresIn: -1 },
    );
    const missingUser = await jwtService.signAsync({ sub: randomUUID() });

    for (const token of [invalid, expired, missingUser]) {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(parseError(response.text).code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects a token signed with an unsupported algorithm', async () => {
    const token = await jwtService.signAsync(
      { sub: randomUUID() },
      { algorithm: 'HS512' },
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(parseError(response.text).code).toBe('UNAUTHENTICATED');
  });

  it('returns the current safe User for a valid token', async () => {
    const user = await registerUser();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'correct-password' })
      .expect(200);
    const loginBody = parseLogin(login.text);

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  async function registerUser(email = 'user@example.com'): Promise<UserEntity> {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(validRegistration(email))
      .expect(201);
    return users.findOneByOrFail({ email: email.trim().toLowerCase() });
  }
});

function validRegistration(email = 'user@example.com') {
  return {
    name: 'Example User',
    email,
    password: 'correct-password',
  };
}

function assertError(
  text: string,
  statusCode: number,
  code: string,
  message: string,
  path: string,
): ErrorBody {
  const body = parseError(text);
  expect(body).toMatchObject({ statusCode, code, message, path });
  expect(typeof body.details).toBe('object');
  expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  return body;
}

function parseError(text: string): ErrorBody {
  const body: unknown = JSON.parse(text);
  if (
    !isRecord(body) ||
    typeof body.statusCode !== 'number' ||
    typeof body.code !== 'string' ||
    typeof body.message !== 'string' ||
    !isRecord(body.details) ||
    typeof body.timestamp !== 'string' ||
    typeof body.path !== 'string'
  ) {
    throw new Error('Invalid error contract');
  }
  return {
    statusCode: body.statusCode,
    code: body.code,
    message: body.message,
    details: body.details,
    timestamp: body.timestamp,
    path: body.path,
  };
}

function parseLogin(text: string): LoginBody {
  const body: unknown = JSON.parse(text);
  if (
    !isRecord(body) ||
    typeof body.accessToken !== 'string' ||
    typeof body.tokenType !== 'string' ||
    typeof body.expiresIn !== 'number' ||
    !isRecord(body.user) ||
    typeof body.user.id !== 'string' ||
    typeof body.user.name !== 'string' ||
    typeof body.user.email !== 'string'
  ) {
    throw new Error('Invalid login response');
  }
  return {
    accessToken: body.accessToken,
    tokenType: body.tokenType,
    expiresIn: body.expiresIn,
    user: {
      id: body.user.id,
      name: body.user.name,
      email: body.user.email,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
