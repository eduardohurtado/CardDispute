import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './notifications/notifications.module.js';
import { validateEnv } from './config/env.js';
import { MessageQueueModule } from './message-queue/message-queue.module.js';
import { ApiModule } from './api/api.module.js';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CorrelationIdInterceptor } from './interceptors/correlation.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    ApiModule,
    MessageQueueModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor }],
})
export class AppModule {}
