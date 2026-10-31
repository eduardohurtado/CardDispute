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

const correlationIdFromBody = (content?: Buffer): string | undefined => {
  if (!content) return undefined;

  try {
    const parsed = JSON.parse(content.toString()) as {
      data?: { correlationId?: unknown };
    };
    const correlationId = parsed.data?.correlationId;

    return typeof correlationId === 'string' && correlationId.length > 0
      ? correlationId
      : undefined;
  } catch {
    return undefined;
  }
};

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'rpc') return next.handle();

    const message = context.switchToRpc().getContext<RmqContext>().getMessage();
    const correlationId: string =
      correlationIdFromBody(message.content) ?? randomUUID();

    // Run the whole handler pipeline inside the ALS context
    return new Observable((subscriber) => {
      requestContext.run({ correlationId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
