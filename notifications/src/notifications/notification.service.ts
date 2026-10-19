import { Inject, Injectable, Logger } from '@nestjs/common';
import { DisputeOutcome, DisputeResolvedEvent } from '../types.js';
import { INotificationChannel } from './channels/channel.interface.js';
import {
  CreateNotificationDeliveryPayload,
  IApi,
  NotificationDeliveryStatus,
} from '../api/api.contract.js';
import { NotificationDeliveryNotFound } from '../api/api.errors.js';
import { NotificationError } from '../errors/notification-error.js';

export const DUPLICATED_RESOLVED_MESSAGE =
  'We found support for the duplicate charge.';
export const NOT_SUPPORTED_RESOLVED_MESSAGE =
  'We could not support the duplicate charge claim.';

const CHANNELS = {
  WEB: 'WEB',
};

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
    const alreadyDelivered = await this.#wasAlreadyDelivered(event.eventId);
    if (alreadyDelivered) {
      this.#logger.log(
        `Notification for dispute ${event.disputeId} already delivered`,
      );
      return;
    }

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

  async #wasAlreadyDelivered(eventId: string): Promise<boolean> {
    try {
      const delivery = await this.api.fetchNotification(eventId);
      return delivery.status === DELIVERED_STATUS;
    } catch (error) {
      if (error instanceof NotificationDeliveryNotFound) {
        return false;
      }
      throw error;
    }
  }

  async #recordDelivery(
    event: DisputeResolvedEvent,
    status: NotificationDeliveryStatus,
    errorCode?: string,
  ): Promise<void> {
    const { disputeId, eventId, providerRef } = event;
    const payload: CreateNotificationDeliveryPayload = {
      channel: CHANNELS.WEB,
      processedAt: new Date().toISOString(),
      status,
      disputeId,
      eventId,
      providerRef,
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
