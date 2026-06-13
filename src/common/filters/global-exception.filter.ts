import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse, mapException } from '../errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    const mapped = mapException(exception);
    const body: ApiErrorResponse = {
      ...mapped,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    response.status(mapped.statusCode).json(body);
  }
}
