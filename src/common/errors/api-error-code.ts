export enum ApiErrorCode {
  ValidationError = 'VALIDATION_ERROR',
  BadRequest = 'BAD_REQUEST',
  Unauthenticated = 'UNAUTHENTICATED',
  Forbidden = 'FORBIDDEN',
  ResourceNotFound = 'RESOURCE_NOT_FOUND',
  Conflict = 'CONFLICT',
  TooManyRequests = 'TOO_MANY_REQUESTS',
  PayloadTooLarge = 'PAYLOAD_TOO_LARGE',
  InternalError = 'INTERNAL_ERROR',
}
