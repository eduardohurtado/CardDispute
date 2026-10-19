import { Global, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.js';
import { connect } from 'amqplib';
import { retryQueueName } from '../config/constants.js';
import { MessageQueueService } from './message-queue.service.js';

@Global()
@Module({ providers: [MessageQueueService], exports: [MessageQueueService] })
export class MessageQueueModule implements OnModuleInit {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}
  async onModuleInit() {
    const connection = await connect(
      this.config.getOrThrow('RABBITMQ_CONNECTION_STRING'),
    );
    const channel = await connection.createChannel();
    const limit = this.config.getOrThrow<number>('RETRY_LIMIT');
    // const baseDelay = this.config.getOrThrow<number>('RETRY_BASE_DELAY_MS');
    const mainQueue = this.config.getOrThrow<string>(
      'RABBITMQ_QUEUE_NAME',
    );
    const mainExchange = this.config.getOrThrow<string>("RABBITMQ_EXCHANGE_NAME")

    try {
      for (let attempt = 1; attempt <= limit; attempt++) {
        await channel.assertQueue(retryQueueName(mainQueue, attempt), {
          durable: true,
          // Note: This is not easy to change once the queue is created
          // messageTtl: backoffMs(baseDelay, attempt),
          // default exchange
          deadLetterExchange: mainExchange,
          deadLetterRoutingKey: mainQueue,
        });
      }
    } finally {
      await channel.close();
      await connection.close();
    }
  }
}
