import {
  isRetryableStatus,
  NotificationError,
} from '../errors/notification-error.js';

/**
 * Base API error. A `status` of `null` means the request never reached the
 * backend (network failure, timeout, DNS) and is treated as retryable.
 */
export class NotificationApiError extends NotificationError {
  constructor(
    message: string,
    code: string,
    public readonly status: number | null,
    options?: { cause?: unknown },
  ) {
    super(message, code, status === null || isRetryableStatus(status), options);
  }
}

export class NotificationDeliveryNotFound extends NotificationApiError {
  constructor(eventId: string) {
    super(`Notification ${eventId} not found`, 'DELIVERY_NOT_FOUND', 404);
  }
}

export class NotificationDeliveryCreationError extends NotificationApiError {
  constructor(
    disputeId: string,
    status: number | null = null,
    options?: { cause?: unknown },
  ) {
    super(
      `Failed to create notification delivery for dispute ${disputeId}`,
      'DELIVERY_CREATION_FAILED',
      status,
      options,
    );
  }
}

export class NotificationDeliveryError extends NotificationApiError {
  constructor(status: number | null = null, options?: { cause?: unknown }) {
    super(
      'Failed to fetch notification delivery',
      'DELIVERY_FETCH_FAILED',
      status,
      options,
    );
  }
}
