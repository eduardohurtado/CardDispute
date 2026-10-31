export type NotificationDeliveryStatus = 'DELIVERED' | 'FAILED';

export interface CreateNotificationDeliveryPayload {
  eventId: string;
  disputeId: string;
  channel: 'MOCK_EMAIL';
  status: NotificationDeliveryStatus;
  processedAt: string;
  providerRef?: string;
  errorCode?: string;
}

export interface IApi {
  createNotification(payload: CreateNotificationDeliveryPayload): Promise<void>;
}

export const IApi = Symbol('IApi');
