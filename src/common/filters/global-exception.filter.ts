import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ApiErrorResponse, mapException } from '../errors';
import { RequestWithId } from '../http/request-with-id';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Optional() private readonly logger?: PinoLogger) {
    this.logger?.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    const mapped = mapException(exception);
    const body: ApiErrorResponse = {
      ...mapped,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId: request.id,
    };

    if (mapped.statusCode >= 500) {
      this.logger?.error(
        { err: exception, requestId: request.id, errorCode: mapped.code },
        'Unhandled HTTP error',
      );
    }

    response.locals ??= {};
    response.locals.errorCode = mapped.code;
    response.status(mapped.statusCode).json(body);
  }
}
