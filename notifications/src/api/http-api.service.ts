import { Injectable } from '@nestjs/common';
import {
  CreateNotificationDeliveryPayload,
  IApi,
  NotificationDelivery,
} from './api.contract.js';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.js';
import {
  NotificationDeliveryCreationError,
  NotificationDeliveryError,
  NotificationDeliveryNotFound,
} from './api.errors.js';
import { getCorrelationId } from '../interceptors/correlation.interceptor.js';

const API_TIMEOUT_MS = 5000;
// The backend deduplicates deliveries by idempotency key and answers with the
// existing record, which means the delivery was already created.
const ALREADY_CREATED_STATUS = 409;

@Injectable()
export class HttpApiService implements IApi {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  async fetchNotification(eventId: string): Promise<NotificationDelivery> {
    let res: Response;
    try {
      const correlationId = getCorrelationId();
      res = await fetch(`${this.#baseUrl()}/notifications/${eventId}`, {
        headers: { ...this.#headers(), 'X-Correlation-Id': correlationId },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new NotificationDeliveryError(null, { cause });
    }

    if (res.status === 404) {
      throw new NotificationDeliveryNotFound(eventId);
    }
    if (!res.ok) {
      throw new NotificationDeliveryError(res.status);
    }
    return res.json();
  }

  async createNotification(
    payload: CreateNotificationDeliveryPayload,
  ): Promise<void> {
    let res: Response;
    try {
      const correlationId = getCorrelationId();
      res = await fetch(`${this.#baseUrl()}/notifications`, {
        method: 'POST',
        headers: {
          ...this.#headers(),
          'Content-Type': 'application/json',
          'Idempotency-Key': payload.eventId,
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new NotificationDeliveryCreationError(payload.disputeId, null, {
        cause,
      });
    }

    if (res.status === ALREADY_CREATED_STATUS) {
      return;
    }
    if (!res.ok) {
      throw new NotificationDeliveryCreationError(
        payload.disputeId,
        res.status,
      );
    }
  }

  #headers() {
    return {
      Authentication: this.config.getOrThrow<string>(
        'BACKEND_AUTHORIZATION_KEY',
      ),
    };
  }

  #baseUrl() {
    return this.config.getOrThrow<string>('BACKEND_API_BASE_URL');
  }
}
