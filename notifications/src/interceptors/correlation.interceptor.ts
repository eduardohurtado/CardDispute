// correlation/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';

export interface RequestContext {
  correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
export const getCorrelationId = () => requestContext.getStore()?.correlationId!;

export const CORRELATION_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'rpc') return next.handle();

    const message = context.switchToRpc().getContext<RmqContext>().getMessage();
    const headers = message.properties?.headers ?? {};
    const correlationId: string = headers[CORRELATION_HEADER] ?? randomUUID();

    // Run the whole handler pipeline inside the ALS context
    return new Observable((subscriber) => {
      requestContext.run({ correlationId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
