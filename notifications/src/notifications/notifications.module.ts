import { Module } from '@nestjs/common';
import { INotificationChannel } from './channels/channel.interface.js';
import { NotificationController } from './notification.controller.js';
import { JSONConsoleNotificationChannel } from './channels/console.channel.js';
import { NotificationService } from './notification.service.js';
import { NTFYNotificationChannel } from './channels/NTFYChannel.js';

@Module({
  controllers: [NotificationController],
  providers: [
    { provide: INotificationChannel, useClass: NTFYNotificationChannel },
    NotificationService,
  ],
})
export class NotificationsModule {}
