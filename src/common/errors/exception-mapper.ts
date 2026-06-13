import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from './api-error-code';

export interface MappedException {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details: Record<string, unknown>;
}

const statusCodeMap: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BadRequest,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.Unauthenticated,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.ResourceNotFound,
  [HttpStatus.CONFLICT]: ApiErrorCode.Conflict,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.TooManyRequests,
};

const defaultMessages: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad request',
  [HttpStatus.UNAUTHORIZED]: 'Authentication is required',
  [HttpStatus.FORBIDDEN]: 'Access is forbidden',
  [HttpStatus.NOT_FOUND]: 'Resource not found',
  [HttpStatus.CONFLICT]: 'Resource conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests',
};

export function mapException(exception: unknown): MappedException {
  if (!(exception instanceof HttpException)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ApiErrorCode.InternalError,
      message: 'An unexpected error occurred',
      details: {},
    };
  }

  const statusCode = exception.getStatus();
  const response = exception.getResponse();
  const validation = getValidationResponse(response);

  if (validation) {
    return {
      statusCode,
      code: ApiErrorCode.ValidationError,
      message: validation.message,
      details: validation.details,
    };
  }

  const code = statusCodeMap[statusCode];

  if (!code) {
    return {
      statusCode,
      code: ApiErrorCode.InternalError,
      message: 'An unexpected error occurred',
      details: {},
    };
  }

  return {
    statusCode,
    code,
    message:
      getSafeMessage(response) ??
      defaultMessages[statusCode] ??
      'An unexpected error occurred',
    details: {},
  };
}

function getValidationResponse(
  response: string | object,
): { message: string; details: Record<string, unknown> } | undefined {
  if (!isRecord(response)) {
    return undefined;
  }

  if (
    response.code !== ApiErrorCode.ValidationError ||
    typeof response.message !== 'string' ||
    !isRecord(response.details)
  ) {
    return undefined;
  }

  return {
    message: response.message,
    details: response.details,
  };
}

function getSafeMessage(response: string | object): string | undefined {
  if (typeof response === 'string') {
    return response;
  }

  if (isRecord(response) && typeof response.message === 'string') {
    return response.message;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
