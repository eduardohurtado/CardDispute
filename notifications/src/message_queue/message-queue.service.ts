import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.js';
import { Channel, Message } from 'amqplib';
import { retryQueueName } from '../config/constants.js';

export const backoffMs = (base: number, attempt: number) =>
  base * 2 ** (attempt - 1);

@Injectable()
export class MessageQueueService {
  #logger = new Logger(MessageQueueService.name);
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  async markAsProcessed(channel: Channel, message: Message) {
    channel.ack(message);
  }

  async hasExceededRetries(message: Message) {
    const currentAttempt =
      message.properties.headers?.['x-current-attempt'] || 0;
    const retryLimit = this.config.getOrThrow<number>('RETRY_LIMIT');
    return currentAttempt >= retryLimit;
  }

  async retry(
    channel: Channel,
    message: Message,
    eventId: string,
  ) {
    const currentAttempt =
      +message.properties.headers?.['x-current-attempt'] || 0;
    const nextAttemptNumber = currentAttempt + 1;
    this.#logger.log(`Retry ${nextAttemptNumber} for notification ${eventId}`);
    const headers = {
      ...message.properties.headers,
      'x-current-attempt': nextAttemptNumber,
    };
    const mainQueue = this.config.getOrThrow<string>(
      'RABBITMQ_NOTIFICATION_QUEUE_NAME',
    );
    const baseDelay = this.config.getOrThrow<number>('RETRY_BASE_DELAY_MS');
    channel.sendToQueue(
      retryQueueName(mainQueue, nextAttemptNumber),
      message.content,
      {
        headers,
        persistent: true,
        expiration: backoffMs(baseDelay, nextAttemptNumber),
      },
    );
    await this.markAsProcessed(channel, message)
  }
  async sendToDLQ(channel: Channel, message: Message) {
    channel.nack(message, false, false);
  }
}
