import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConsoleLogger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      logger: new ConsoleLogger({ json: true }),
      options: {
        urls: [process.env.RABBITMQ_CONNECTION_STRING || ''],
        queue: process.env.RABBITMQ_NOTIFICATION_QUEUE_NAME,
        noAck: false,
        prefetchCount: 10,
        queueOptions: {
          durable: true,
          deadLetterExchange: 'dlx',
          deadLetterRoutingKey: 'dlq',
        },
      },
    },
  );
  await app.listen();
}
await bootstrap();
