export class NotificationChannelSendError extends Error {
  constructor(channelName: string) {
    super(`Failed to send notification via ${channelName} channel`);
    this.name = 'NotificationChannelSendError';
  }
}
