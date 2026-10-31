import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.js';
import {
  CreateNotificationDeliveryPayload,
  IApi,
} from './api.contract.js';
import {
  NotificationDeliveryCreationError,
  NotificationReceiptConflict,
} from './api.errors.js';
import { getCorrelationId } from '../interceptors/correlation.interceptor.js';

const API_TIMEOUT_MS = 5000;
const CONFLICT_STATUS = 409;

@Injectable()
export class HttpApiService implements IApi {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  async createNotification(
    payload: CreateNotificationDeliveryPayload,
  ): Promise<void> {
    let res: Response;
    try {
      const correlationId = getCorrelationId();
      res = await fetch(`${this.#baseUrl()}/internal/v1/notification-receipts`, {
        method: 'POST',
        headers: {
          ...this.#headers(),
          'Content-Type': 'application/json',
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

    if (res.status === CONFLICT_STATUS) {
      throw new NotificationReceiptConflict(payload.eventId);
    }
    if (!res.ok) {
      throw new NotificationDeliveryCreationError(
        payload.disputeId,
        res.status,
      );
    }
  }

  #headers() {
    const username = this.config.getOrThrow<string>(
      'BACKEND_BASIC_AUTH_USERNAME',
    );
    const password = this.config.getOrThrow<string>(
      'BACKEND_BASIC_AUTH_PASSWORD',
    );
    return {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };
  }

  #baseUrl() {
    return this.config
      .getOrThrow<string>('BACKEND_API_BASE_URL')
      .replace(/\/+$/, '');
  }
}
