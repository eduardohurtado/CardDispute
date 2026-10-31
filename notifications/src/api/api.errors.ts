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

export class NotificationReceiptConflict extends NotificationApiError {
  constructor(eventId: string) {
    super(
      `Conflicting notification receipt for event ${eventId}`,
      'RECEIPT_CONFLICT',
      409,
    );
  }
}
