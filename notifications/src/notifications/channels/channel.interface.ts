// Concrete implementations could be SendGrid, Twilio, Push Notification Service, etc.
export interface INotificationChannel {
  send(event: any): Promise<void>;
}

export const INotificationChannel = Symbol('INotificationChannel');
