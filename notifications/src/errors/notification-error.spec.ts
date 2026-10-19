import {
  isRetryableError,
  isRetryableStatus,
  NotificationError,
} from './notification-error.js';
import {
  NotificationDeliveryCreationError,
  NotificationDeliveryError,
  NotificationDeliveryNotFound,
} from '../api/api.errors.js';
import { NotificationChannelSendError } from '../notifications/channels/channel.errors.js';

describe('isRetryableStatus', () => {
  it.each([408, 425, 429, 500, 502, 503, 504])(
    'treats %i as retryable',
    (status) => {
      expect(isRetryableStatus(status)).toBe(true);
    },
  );

  it.each([400, 401, 403, 404, 409, 422])(
    'treats %i as non-retryable',
    (status) => {
      expect(isRetryableStatus(status)).toBe(false);
    },
  );
});

describe('isRetryableError', () => {
  it('defaults unknown errors to retryable so transient bugs get another chance', () => {
    expect(isRetryableError(new TypeError('boom'))).toBe(true);
    expect(isRetryableError('string error')).toBe(true);
    expect(isRetryableError(undefined)).toBe(true);
  });

  it('respects the retryable flag on NotificationError', () => {
    expect(isRetryableError(new NotificationError('a', 'A', true))).toBe(true);
    expect(isRetryableError(new NotificationError('b', 'B', false))).toBe(
      false,
    );
  });
});

describe('API error classification', () => {
  it('treats requests that never reached the backend (status null) as retryable', () => {
    expect(new NotificationDeliveryError(null).retryable).toBe(true);
    expect(new NotificationDeliveryCreationError('disp', null).retryable).toBe(
      true,
    );
  });

  it('classifies delivery lookup 404 as non-retryable', () => {
    const error = new NotificationDeliveryNotFound('evt-1');
    expect(error.retryable).toBe(false);
    expect(error.code).toBe('DELIVERY_NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('classifies retryable HTTP statuses on creation failures as retryable', () => {
    expect(new NotificationDeliveryCreationError('disp', 503).retryable).toBe(
      true,
    );
    expect(new NotificationDeliveryCreationError('disp', 400).retryable).toBe(
      false,
    );
  });
});

describe('channel error classification', () => {
  it('treats status 0 (network failure before HTTP) as retryable', () => {
    const error = new NotificationChannelSendError('NTFY', 0);
    expect(error.retryable).toBe(true);
    expect(error.status).toBe(0);
  });

  it('treats 5xx channel responses as retryable and 4xx as not', () => {
    expect(new NotificationChannelSendError('NTFY', 500).retryable).toBe(true);
    expect(new NotificationChannelSendError('NTFY', 404).retryable).toBe(false);
  });
});
