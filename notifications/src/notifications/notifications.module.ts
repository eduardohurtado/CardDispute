import { Module } from '@nestjs/common';
import { INotificationChannel } from './channels/channel.interface.js';
import { NotificationController } from './notification.controller.js';
import { ConsoleNotificationService } from './channels/console.channel.js';

@Module({
  controllers: [NotificationController],
  providers: [
    { provide: INotificationChannel, useClass: ConsoleNotificationService },
  ],
})
export class NotificationsModule {}
