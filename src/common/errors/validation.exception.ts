import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from './api-error-code';
import { ValidationErrorDetails } from './validation-error-details';

export class ValidationException extends BadRequestException {
  constructor(details: ValidationErrorDetails) {
    super({
      code: ApiErrorCode.ValidationError,
      message: 'Request validation failed',
      details,
    });
  }
}
