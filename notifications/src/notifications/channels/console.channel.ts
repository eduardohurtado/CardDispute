import { Injectable } from '@nestjs/common';
import { INotificationChannel } from './channel.interface.js';

@Injectable()
export class ConsoleNotificationService implements INotificationChannel {
  async send(event: any): Promise<void> {
    console.log('Notification sent for event:', event);
  }
}
