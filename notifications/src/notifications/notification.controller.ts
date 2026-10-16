import { Controller, Inject } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { NOTIFICATION_TOPIC_V1 } from './constants.js';
import { INotificationChannel } from './channels/channel.interface.js';
import { Channel, Message } from 'amqplib';

@Controller()
export class NotificationController {
  #channel: INotificationChannel;
  constructor(@Inject(INotificationChannel) channel: INotificationChannel) {
    this.#channel = channel;
  }
  @MessagePattern(NOTIFICATION_TOPIC_V1)
  async handleNotification(
    @Ctx() context: RmqContext,
    @Payload() event: unknown,
  ) {
    const channel: Channel = context.getChannelRef();
    const message = context.getMessage() as Message;
    await this.#channel.send(event);
    channel.ack(message);
  }
}
