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
    const mainQueue = this.config.getOrThrow<string>('RABBITMQ_QUEUE_NAME');
    const mainExchange = this.config.getOrThrow<string>(
      'RABBITMQ_EXCHANGE_NAME',
    );
    try {
      const dlx = `${mainExchange}.dlx`;
      const dlq = `${mainQueue}.dlq`;

      await channel.assertExchange(dlx, 'topic', { durable: true });
      await channel.assertQueue(dlq, { durable: true });
      await channel.bindQueue(dlq, dlx, dlq);
      for (let attempt = 1; attempt <= limit; attempt++) {
        await channel.assertQueue(retryQueueName(mainQueue, attempt), {
          durable: true,
          // Once the per-message TTL expires the message is dead-lettered to
          // the default exchange, which routes by queue name straight back to
          // the main queue. Routing through the main topic exchange would drop
          // the message, since the queue name is not a valid binding key there.
          deadLetterExchange: '',
          deadLetterRoutingKey: mainQueue,
        });
      }
    } finally {
      await channel.close();
      await connection.close();
    }
  }
}
