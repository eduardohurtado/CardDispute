import {
  isRetryableStatus,
  NotificationError,
} from '../../errors/notification-error.js';

export const NETWORK_ERROR_STATUS = 0;

export class NotificationChannelSendError extends NotificationError {
  constructor(
    public readonly channelName: string,
    public readonly status: number,
    options?: { cause?: unknown },
  ) {
    super(
      `Failed to send notification via ${channelName} channel`,
      'CHANNEL_SEND_FAILED',
      status === NETWORK_ERROR_STATUS || isRetryableStatus(status),
      options,
    );
  }
}
