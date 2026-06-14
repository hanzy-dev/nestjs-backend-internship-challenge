import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  const middleware = new RequestIdMiddleware();

  it('accepts a valid bounded incoming request ID', () => {
    const request = createRequest('client-request.123');
    const response = createResponse();
    const next = jest.fn();

    middleware.use(request as never, response as never, next);

    expect(request.id).toBe('client-request.123');
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      'client-request.123',
    );
    expect(next).toHaveBeenCalled();
  });

  it.each(['unsafe value\n', 'x'.repeat(129), ''])(
    'generates a UUID for unsafe request ID %j',
    (incoming) => {
      const request = createRequest(incoming);
      const response = createResponse();

      middleware.use(request as never, response as never, jest.fn());

      expect(request.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    },
  );
});

function createRequest(incoming?: string) {
  return {
    id: '',
    header: jest.fn().mockReturnValue(incoming),
  };
}

function createResponse() {
  return {
    setHeader: jest.fn(),
  };
}
