import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationChannel,
  NotificationMessage,
} from './channel.interface.js';
import {
  NETWORK_ERROR_STATUS,
  NotificationChannelSendError,
} from './channel.errors.js';

const NTFY_API_BASE_URL = 'https://ntfy.sh';
const TIMEOUT_MS = 5000;

/**
 * NTFYChannel is a notification channel that sends notifications using the NTFY service.
 * @see https://docs.ntfy.sh/publish/#__tabbed_1_4
 */
@Injectable()
export class NTFYNotificationChannel implements INotificationChannel {
  #logger = new Logger(NTFYNotificationChannel.name);
  // Just to ensure a unique public topic
  #topic = 'techm-card-dispute-alerts-mopeXL0441';
  async send(event: NotificationMessage): Promise<void> {
    let res: Response;
    try {
      // TODO: Maybe implement an action like opening the URL when clicking on it?
      res = await fetch(`${NTFY_API_BASE_URL}/${this.#topic}`, {
        method: 'POST',
        body: event.body,
        headers: {
          Title: event.subject,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      // Network failures and timeouts carry no status, they are always retryable.
      throw new NotificationChannelSendError('NTFY', NETWORK_ERROR_STATUS, {
        cause,
      });
    }

    if (!res.ok) {
      throw new NotificationChannelSendError('NTFY', res.status);
    }
    this.#logger.log(`Notification sent via NTFY`);
  }
}
