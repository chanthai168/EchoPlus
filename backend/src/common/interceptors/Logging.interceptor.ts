import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, originalUrl, ip, headers, body, query, params } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const correlationId =
      (headers['x-correlation-id'] as string) ||
      (headers['x-request-id'] as string) ||
      '-';

    const now = Date.now();

    this.logger.log(
      `--> ${method} ${originalUrl} | ip=${ip} | cid=${correlationId} | ua="${userAgent}"`,
    );

    if (Object.keys(params || {}).length) {
      this.logger.debug(`    params: ${JSON.stringify(params)}`);
    }
    if (Object.keys(query || {}).length) {
      this.logger.debug(`    query:  ${JSON.stringify(query)}`);
    }
    if (body && Object.keys(body).length) {
      this.logger.debug(`    body:   ${JSON.stringify(this.sanitize(body))}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const elapsed = Date.now() - now;
          this.logger.log(
            `<-- ${method} ${originalUrl} ${response.statusCode} | ${elapsed}ms | cid=${correlationId}`,
          );
        },
        error: (err) => {
          const elapsed = Date.now() - now;
          this.logger.error(
            `<-- ${method} ${originalUrl} ${err?.status || 500} | ${elapsed}ms | cid=${correlationId} | ${err?.message}`,
          );
        },
      }),
    );
  }

  /**
   * Remove sensitive fields before logging the body.
   */
  private sanitize(body: Record<string, any>): Record<string, any> {
    const SENSITIVE = ['password', 'token', 'authorization', 'secret', 'refreshToken'];
    const clone = { ...body };
    for (const key of Object.keys(clone)) {
      if (SENSITIVE.includes(key)) clone[key] = '***';
    }
    return clone;
  }
}