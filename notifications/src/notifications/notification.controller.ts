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
import { MessageQueueService } from '../message_queue/message-queue.service.js';

export const DUPLICATED_RESOLVED_NOTIFICATION_MESSAGE =
  'We found support for the duplicate charge.';
export const NOT_SUPPORTED_RESOLVED_NOTIFICATION_MESSAGE =
  'We could not support the duplicate charge claim.';

export const backoffMs = (base: number, attempt: number) =>
  base * 2 ** (attempt - 1);

@Controller()
export class NotificationController {
  #logger = new Logger(NotificationController.name);
  #notifier: INotificationChannel;
  constructor(
    @Inject(INotificationChannel) notifier: INotificationChannel,
    private readonly queueService: MessageQueueService,
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
      await this.queueService.markAsProcessed(channel, message);
    } catch (error) {
      this.#logger.error(error);
      const hasExceededRetries = await this.queueService.hasExceededRetries(message);
      if (hasExceededRetries) {
        await this.queueService.sendToDLQ(channel, message);
      } else {
        await this.queueService.retry(
          channel,
          message,
          event.event_id,
        );
      }
    }
  }
}
