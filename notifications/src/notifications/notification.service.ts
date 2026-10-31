import { Inject, Injectable, Logger } from '@nestjs/common';
import { DisputeOutcome, DisputeResolvedEvent } from '../types.js';
import { INotificationChannel } from './channels/channel.interface.js';
import {
  CreateNotificationDeliveryPayload,
  IApi,
  NotificationDeliveryStatus,
} from '../api/api.contract.js';
import { NotificationError } from '../errors/notification-error.js';

export const DUPLICATED_RESOLVED_MESSAGE =
  'We found support for the duplicate charge.';
export const NOT_SUPPORTED_RESOLVED_MESSAGE =
  'We could not support the duplicate charge claim.';

const CHANNELS = {
  MOCK_EMAIL: 'MOCK_EMAIL',
} as const;

const DELIVERED_STATUS: NotificationDeliveryStatus = 'DELIVERED';
const FAILED_STATUS: NotificationDeliveryStatus = 'FAILED';

@Injectable()
export class NotificationService {
  #logger = new Logger(NotificationService.name);
  #notifier: INotificationChannel;
  constructor(
    @Inject(INotificationChannel) notifier: INotificationChannel,
    @Inject(IApi) private readonly api: IApi,
  ) {
    this.#notifier = notifier;
  }

  async handleDisputeResolved(event: DisputeResolvedEvent): Promise<void> {
    this.#logger.log(
      `Sending notification for dispute ${event.disputeId} with outcome ${event.outcome}`,
    );
    await this.#sendNotification(event.disputeId, event.outcome);
    await this.#recordDelivery(event, DELIVERED_STATUS);
  }

  /**
   * Best-effort: marking the delivery as failed is not allowed to block the
   * message from reaching the DLQ, so failures here are logged and swallowed.
   */
  async markDeliveryFailed(
    event: DisputeResolvedEvent,
    error: unknown,
  ): Promise<void> {
    const errorCode =
      error instanceof NotificationError ? error.code : 'UNKNOWN_ERROR';
    try {
      await this.#recordDelivery(event, FAILED_STATUS, errorCode);
    } catch (cause) {
      this.#logger.error(
        `Failed to mark delivery ${event.eventId} as failed`,
        cause,
      );
    }
  }

  async #recordDelivery(
    event: DisputeResolvedEvent,
    status: NotificationDeliveryStatus,
    errorCode?: string,
  ): Promise<void> {
    const { disputeId, eventId, occurredAt } = event;
    const payload: CreateNotificationDeliveryPayload = {
      channel: CHANNELS.MOCK_EMAIL,
      processedAt: occurredAt,
      status,
      disputeId,
      eventId,
      errorCode,
    };
    await this.api.createNotification(payload);
  }

  async #sendNotification(
    disputeId: string,
    outcome: DisputeOutcome,
  ): Promise<void> {
    await this.#notifier.send({
      body:
        outcome === 'SUPPORTED'
          ? DUPLICATED_RESOLVED_MESSAGE
          : NOT_SUPPORTED_RESOLVED_MESSAGE,
      subject: `Your dispute ${disputeId} has been resolved`,
    });
  }
}
