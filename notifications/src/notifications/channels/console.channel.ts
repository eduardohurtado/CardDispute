import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationChannel,
  NotificationMessage,
} from './channel.interface.js';

@Injectable()
export class JSONConsoleNotificationChannel implements INotificationChannel {
  #logger = new Logger(JSONConsoleNotificationChannel.name);
  async send(event: NotificationMessage): Promise<void> {
    this.#logger.log(event);
  }
}
