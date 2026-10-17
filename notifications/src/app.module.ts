import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from './notifications/notifications.module.js';
import { EnvVars, validateEnv } from './config/env.js';
import { connect } from 'amqplib';
import { retryQueueName } from './config/constants.js';

export const backoffMs = (base: number, attempt: number) =>
  base * 2 ** (attempt - 1);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    NotificationsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}
  async onModuleInit() {
    const connection = await connect(
      this.config.getOrThrow('RABBITMQ_CONNECTION_STRING'),
    );
    const channel = await connection.createChannel();
    const limit = this.config.getOrThrow<number>('RETRY_LIMIT');
    const baseDelay = this.config.getOrThrow<number>('RETRY_BASE_DELAY_MS');
    const mainQueue = this.config.getOrThrow<string>(
      'RABBITMQ_NOTIFICATION_QUEUE_NAME',
    );

    try {
      for (let attempt = 1; attempt <= limit; attempt++) {
        await channel.assertQueue(retryQueueName(mainQueue, attempt), {
          durable: true,
          // Note: This is not easy to change once the queue is created
          messageTtl: backoffMs(baseDelay, attempt),
          // default exchange
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
