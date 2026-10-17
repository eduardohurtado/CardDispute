import { Module } from '@nestjs/common';
import { INotificationChannel } from './channels/channel.interface.js';
import { NotificationController } from './notification.controller.js';
import { JSONConsoleNotificationChannel } from './channels/console.channel.js';

@Module({
  controllers: [NotificationController],
  providers: [
    { provide: INotificationChannel, useClass: JSONConsoleNotificationChannel },
  ],
})
export class NotificationsModule {}
