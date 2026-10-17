// Concrete implementations could be SendGrid, Twilio, Push Notification Service, etc.
export interface INotificationChannel {
  send(payload: NotificationMessage): Promise<void>;
}

export interface NotificationMessage {
  subject: string;
  body: string;
}

export const INotificationChannel = Symbol('INotificationChannel');
