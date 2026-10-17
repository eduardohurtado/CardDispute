import { Controller, Inject, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { INotificationChannel } from './channels/channel.interface.js';
import { Channel, Message } from 'amqplib';
import { type DisputeResolvedEvent } from '../types.js';
import { NOTIFICATION_TOPIC_V1, retryQueueName } from '../config/constants.js';
import { EnvVars } from '../config/env.js';
import { ConfigService } from '@nestjs/config';

export const DUPLICATED_RESOLVED_NOTIFICATION_MESSAGE =
  'We found support for the duplicate charge.';
export const NOT_SUPPORTED_RESOLVED_NOTIFICATION_MESSAGE =
  'We could not support the duplicate charge claim.';

@Controller()
export class NotificationController {
  #logger = new Logger(NotificationController.name);
  #notifier: INotificationChannel;
  constructor(
    @Inject(INotificationChannel) notifier: INotificationChannel,
    private readonly config: ConfigService<EnvVars, true>,
  ) {
    this.#notifier = notifier;
  }
  @MessagePattern(NOTIFICATION_TOPIC_V1)
  async notifyDisputeResolved(
    @Ctx() context: RmqContext,
    @Payload() event: DisputeResolvedEvent,
  ) {
    const channel: Channel = context.getChannelRef();
    const message = context.getMessage() as Message;
    // TODO: Wrap this in a service layer and control werther we want to requeue the message or
    // send it to the DQL based on the error type
    try {
      await this.#notifier.send({
        body:
          event.outcome === 'SUPPORTED'
            ? DUPLICATED_RESOLVED_NOTIFICATION_MESSAGE
            : NOT_SUPPORTED_RESOLVED_NOTIFICATION_MESSAGE,
        subject: `Your dispute ${event.dispute_id} has been resolved`,
      });
      channel.ack(message);
    } catch (error) {
      this.#logger.error(error);
      const currentAttempt =
        message.properties.headers?.['x-current-attempt'] || 0;
      const retryLimit = this.config.getOrThrow<number>('RETRY_LIMIT');
      if (currentAttempt >= retryLimit) {
        channel.nack(message, false, false); // Reject without requeue (DLQ)
      } else {
        const nextAttemptNumber = currentAttempt + 1;
        this.#logger.log(
          `Retry ${nextAttemptNumber} for notification ${event.event_id}`,
        );
        const headers = {
          ...message.properties.headers,
          'x-current-attempt': nextAttemptNumber,
        };
        const mainQueue = this.config.getOrThrow<string>(
          'RABBITMQ_NOTIFICATION_QUEUE_NAME',
        );
        channel.sendToQueue(
          retryQueueName(mainQueue, nextAttemptNumber),
          message.content,
          { headers, persistent: true },
        );
        channel.ack(message);
      }
    }
  }
}
