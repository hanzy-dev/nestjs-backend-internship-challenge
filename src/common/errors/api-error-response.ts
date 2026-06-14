import { ApiErrorCode } from './api-error-code';

export interface ApiErrorResponse {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  path: string;
  requestId: string;
}
