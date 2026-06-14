import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiHeader,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiErrorResponseModel } from './swagger.models';

export function ApiRequestIdHeader(): MethodDecorator & ClassDecorator {
  return ApiHeader({
    name: 'X-Request-ID',
    required: false,
    description:
      'Identifier korelasi opsional, maksimum 128 karakter aman. UUID dibuat jika tidak valid.',
  });
}

export function ApiErrorResponses(
  ...statuses: Array<{
    status: number;
    description: string;
  }>
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponseModel),
    ...statuses.map(({ status, description }) =>
      ApiResponse({
        status,
        description,
        schema: { $ref: getSchemaPath(ApiErrorResponseModel) },
      }),
    ),
  );
}

export function ApiStandardProtectedErrors(): MethodDecorator & ClassDecorator {
  return ApiErrorResponses(
    {
      status: HttpStatus.BAD_REQUEST,
      description: 'Request atau parameter tidak valid.',
    },
    {
      status: HttpStatus.UNAUTHORIZED,
      description: 'Bearer token tidak ada atau tidak valid.',
    },
    {
      status: HttpStatus.NOT_FOUND,
      description: 'Resource tidak ditemukan atau bukan milik pengguna.',
    },
  );
}

export function ApiTypedResponse(
  status: number,
  description: string,
  type: Type<unknown>,
): MethodDecorator & ClassDecorator {
  return ApiResponse({ status, description, type });
}
