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
        queue: process.env.RABBITMQ_QUEUE_NAME,
        noAck: false,
        prefetchCount: 10,
        exchange: process.env.RABBITMQ_EXCHANGE_NAME,
        routingKey: process.env.RABBITMQ_ROUTING_KEY,
        queueOptions: {
          durable: true,
          deadLetterExchange: `${process.env.RABBITMQ_EXCHANGE_NAME}.dlx`,
          deadLetterRoutingKey: `${process.env.RABBITMQ_QUEUE_NAME}.dlq`,
        },
      },
    },
  );
  await app.listen();
}
await bootstrap();
