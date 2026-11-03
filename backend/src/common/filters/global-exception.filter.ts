import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { Prisma } from '../../generated/prisma/client.js';

interface ApiErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  errorCode?: string;          
  details?: Record<string, any>; 
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.log(exception);

    let status: number;
    let errorResponse: any;

    if (exception instanceof HttpException) {

      status = exception.getStatus();
      const res = exception.getResponse() as any;
      
      errorResponse = typeof res === 'string' ? { message: res } : res;
      
      if(res.errorCode && res.errorCode === 'VALIDATION_ERROR'){
        errorResponse.details = this.formatValidationErrors(res.error);
      }

    } 

    else if(exception instanceof Prisma.PrismaClientKnownRequestError){
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          errorResponse = `A record with this already exists`;
          break;

        case 'P2025':
          status = HttpStatus.CONFLICT;
          errorResponse = 'Resource Notfound';
          break;

        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          errorResponse = { message: 'Internal server error' };
          this.logger.error(exception);
          break;
      }
    }
    
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = { message: 'Internal server error' };
      this.logger.error(exception);
    }

    const { message, errorCode, statusCode, details, ...extra } = errorResponse;
    
    // Build the final response body
    const body: ApiErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorResponse.message || 'Unknown error',
      errorCode: errorResponse.errorCode,
      details: errorResponse.details,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status} - ${errorResponse.message}`,
      );
    }

    response.status(status).json(body);
  }

  private formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const error of errors) {
      const field = error.property;
      const messages = error.constraints
        ? Object.values(error.constraints)
        : ['Invalid value'];

      result[field] = messages;

      // Nested validation support
      if (error.children && error.children.length > 0) {
        const nested = this.formatValidationErrors(error.children);
        for (const key of Object.keys(nested)) {
          result[`${field}.${key}`] = nested[key];
        }
      }
    }

    return result;
  }
}