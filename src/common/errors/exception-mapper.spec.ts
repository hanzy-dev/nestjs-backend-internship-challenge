import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiErrorCode } from './api-error-code';
import { mapException } from './exception-mapper';
import { ValidationException } from './validation.exception';

describe('mapException', () => {
  it('maps validation errors with normalized details', () => {
    expect(
      mapException(
        new ValidationException({
          fields: [{ field: 'email', messages: ['invalid email'] }],
        }),
      ),
    ).toEqual({
      statusCode: 400,
      code: ApiErrorCode.ValidationError,
      message: 'Request validation failed',
      details: {
        fields: [{ field: 'email', messages: ['invalid email'] }],
      },
    });
  });

  it.each([
    [new BadRequestException('Invalid request'), 400, ApiErrorCode.BadRequest],
    [
      new UnauthorizedException('Sign in required'),
      401,
      ApiErrorCode.Unauthenticated,
    ],
    [new ForbiddenException('Denied'), 403, ApiErrorCode.Forbidden],
    [new NotFoundException('Missing'), 404, ApiErrorCode.ResourceNotFound],
    [new ConflictException('Duplicate'), 409, ApiErrorCode.Conflict],
    [
      new HttpException('Slow down', HttpStatus.TOO_MANY_REQUESTS),
      429,
      ApiErrorCode.TooManyRequests,
    ],
  ])('maps known HTTP exceptions', (exception, statusCode, code) => {
    expect(mapException(exception)).toEqual({
      statusCode,
      code,
      message: exception.message,
      details: {},
    });
  });

  it.each([new Error('private failure'), 'non-error failure'])(
    'maps unexpected values without exposing them',
    (exception) => {
      expect(mapException(exception)).toEqual({
        statusCode: 500,
        code: ApiErrorCode.InternalError,
        message: 'An unexpected error occurred',
        details: {},
      });
    },
  );

  it('hides the message from an internal HTTP exception', () => {
    expect(
      mapException(
        new HttpException(
          'private HTTP failure',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      ),
    ).toEqual({
      statusCode: 500,
      code: ApiErrorCode.InternalError,
      message: 'An unexpected error occurred',
      details: {},
    });
  });
});
