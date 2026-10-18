import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './notifications/notifications.module.js';
import { validateEnv } from './config/env.js';
import { MessageQueueModule } from './message_queue/message-queue.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    MessageQueueModule,
    NotificationsModule,
  ],
})
export class AppModule {}
