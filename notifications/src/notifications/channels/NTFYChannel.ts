import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationChannel,
  NotificationMessage,
} from './channel.interface.js';
import { NotificationChannelSendError } from './channel.errors.js';

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
    try {
      // TODO: Maybe implement an action like opening the URL when clicking on it?
      // Also I can't find docs about API errors here, so assume everything should be retryable
      const res = await fetch(`${NTFY_API_BASE_URL}/${this.#topic}`, {
        method: 'POST',
        body: event.body,
        headers: {
          Title: event.subject,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`Failed to send notification via NTFY: ${res.status}`);
      }
      this.#logger.log(`Notification sent via NTFY`);
    } catch (error) {
      this.#logger.error(error);
      throw new NotificationChannelSendError('NTFY');
    }
  }
}
