import { Injectable } from '@nestjs/common';
import {
  INotificationChannel,
  NotificationMessage,
} from './channel.interface.js';

@Injectable()
export class JSONConsoleNotificationChannel implements INotificationChannel {
  async send(event: NotificationMessage): Promise<void> {
    console.log(event);
  }
}
