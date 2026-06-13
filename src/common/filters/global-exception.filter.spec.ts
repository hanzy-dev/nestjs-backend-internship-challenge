import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  it('writes the standard error response', () => {
    let sentBody: unknown;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn((body: unknown) => {
        sentBody = body;
      }),
    };
    const host = createHttpHost('/api/v1/example', response);

    new GlobalExceptionFilter().catch(
      new BadRequestException('Invalid request'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledTimes(1);

    expect(isRecord(sentBody)).toBe(true);

    if (!isRecord(sentBody)) {
      throw new Error('Expected the filter to produce an object response');
    }

    expect(sentBody.statusCode).toBe(400);
    expect(sentBody.code).toBe('BAD_REQUEST');
    expect(sentBody.message).toBe('Invalid request');
    expect(sentBody.details).toEqual({});
    expect(sentBody.path).toBe('/api/v1/example');
    expect(new Date(String(sentBody.timestamp)).toISOString()).toBe(
      sentBody.timestamp,
    );
  });

  it('does not write a second response after headers are sent', () => {
    const response = {
      headersSent: true,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createHttpHost('/api/v1/example', response);

    new GlobalExceptionFilter().catch(new Error('private failure'), host);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});

interface TestResponse {
  headersSent: boolean;
  status: jest.Mock;
  json: jest.Mock;
}

function createHttpHost(
  originalUrl: string,
  response: TestResponse,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl }),
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as ArgumentsHost;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
