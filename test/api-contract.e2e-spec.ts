import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { ApiContractController } from './fixtures/api-contract/api-contract.controller';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  path: string;
}

describe('API contract (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ApiContractController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts valid DTO input and explicitly transforms a number', () => {
    return request(app.getHttpServer())
      .post('/api/v1/contract/validate')
      .send({
        name: 'Valid name',
        page: '2',
        profile: { email: 'person@example.com' },
      })
      .expect(201)
      .expect({
        name: 'Valid name',
        page: 2,
        profile: { email: 'person@example.com' },
      });
  });

  it.each([
    [
      'missing required property',
      {
        page: 1,
        profile: { email: 'person@example.com' },
      },
      'name',
    ],
    [
      'invalid field value',
      {
        name: 'Valid name',
        page: 1,
        profile: { email: 'invalid-email' },
      },
      'profile.email',
    ],
    [
      'unknown property',
      {
        name: 'Valid name',
        page: 1,
        profile: { email: 'person@example.com' },
        ownerId: 'not-allowed',
      },
      'ownerId',
    ],
  ])('rejects %s', async (_scenario, body, expectedField) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contract/validate')
      .send(body)
      .expect(400);

    const errorBody = parseErrorBody(response.text);
    assertErrorContract(
      errorBody,
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      '/api/v1/contract/validate',
    );

    expect(getValidationFields(errorBody.details)).toContain(expectedField);
  });

  it.each([
    [
      '/api/v1/contract/not-found',
      404,
      'RESOURCE_NOT_FOUND',
      'Contract fixture not found',
    ],
    ['/api/v1/contract/conflict', 409, 'CONFLICT', 'Contract fixture conflict'],
  ])(
    'normalizes known exception at %s',
    async (path, statusCode, code, message) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .expect(statusCode);

      assertErrorContract(
        parseErrorBody(response.text),
        statusCode,
        code,
        message,
        path,
      );
    },
  );

  it('hides unexpected exception details', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/contract/unexpected')
      .expect(500);

    const errorBody = parseErrorBody(response.text);
    assertErrorContract(
      errorBody,
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      '/api/v1/contract/unexpected',
    );
    expect(JSON.stringify(errorBody)).not.toContain('Private fixture failure');
    expect('stack' in errorBody).toBe(false);
  });

  it('excludes sensitive fields during serialization', () => {
    return request(app.getHttpServer())
      .get('/api/v1/contract/serialized')
      .expect(200)
      .expect({ name: 'Visible value' });
  });

  it('keeps the existing root endpoint unchanged', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect({
      name: 'NestJS Backend Internship Challenge',
      status: 'Batch 1 - Bootstrap and configuration',
      version: 'v1',
    });
  });
});

function assertErrorContract(
  body: ErrorBody,
  statusCode: number,
  code: string,
  message: string,
  path: string,
): void {
  expect(body.statusCode).toBe(statusCode);
  expect(body.code).toBe(code);
  expect(body.message).toBe(message);
  expect(typeof body.details).toBe('object');
  expect(body.path).toBe(path);
  expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
}

function parseErrorBody(responseText: string): ErrorBody {
  const parsed: unknown = JSON.parse(responseText);

  if (
    !isRecord(parsed) ||
    typeof parsed.statusCode !== 'number' ||
    typeof parsed.code !== 'string' ||
    typeof parsed.message !== 'string' ||
    !isRecord(parsed.details) ||
    typeof parsed.timestamp !== 'string' ||
    typeof parsed.path !== 'string'
  ) {
    throw new Error('Response does not match the expected error contract');
  }

  return {
    statusCode: parsed.statusCode,
    code: parsed.code,
    message: parsed.message,
    details: parsed.details,
    timestamp: parsed.timestamp,
    path: parsed.path,
  };
}

function getValidationFields(details: Record<string, unknown>): string[] {
  if (!Array.isArray(details.fields)) {
    return [];
  }

  return details.fields.flatMap((fieldError) => {
    if (!isRecord(fieldError) || typeof fieldError.field !== 'string') {
      return [];
    }

    return [fieldError.field];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
