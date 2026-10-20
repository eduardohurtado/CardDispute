import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { type DisputeResolvedEvent } from '../types.js';
import { NOTIFICATION_TOPIC_V1 } from '../config/constants.js';
import { MessageQueueService } from '../message-queue/message-queue.service.js';
import { NotificationService } from './notification.service.js';
import { isRetryableError } from '../errors/notification-error.js';

@Controller()
export class NotificationController {
  #logger = new Logger(NotificationController.name);
  #queueService: MessageQueueService;
  constructor(
    queueService: MessageQueueService,
    private readonly service: NotificationService,
  ) {
    this.#queueService = queueService;
  }

  @MessagePattern(NOTIFICATION_TOPIC_V1)
  async notifyDisputeResolved(
    @Payload() event: DisputeResolvedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel: Channel = context.getChannelRef();
    const message = context.getMessage() as Message;
    this.#logger.log(
      `Received notification for dispute ${event.disputeId} with outcome ${event.outcome}`,
    );
    try {
      await this.service.handleDisputeResolved(event);
      await this.#queueService.markAsProcessed(channel, message);
    } catch (error) {
      this.#logger.error(
        `Failed to process notification for dispute ${event.disputeId}`,
        error,
      );
      const hasExceededRetries =
        await this.#queueService.hasExceededRetries(message);
      const shouldRetry = isRetryableError(error) && !hasExceededRetries;

      if (shouldRetry) {
        await this.#queueService.retry(channel, message, event.eventId);
        return;
      }
      // Best effort
      await this.service.markDeliveryFailed(event, error);
      await this.#queueService.sendToDLQ(channel, message);
    }
  }
}
