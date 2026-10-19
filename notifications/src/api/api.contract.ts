export interface NotificationDelivery {
  event_id: string;
  dispute_id: string;
  status: 'DELIVERED' | 'FAILED';
  provider_ref: string;
  error_code: string;
}

export type NotificationDeliveryStatus = NotificationDelivery['status'];

export interface CreateNotificationDeliveryPayload {
  eventId: string;
  disputeId: string;
  channel: string;
  status: NotificationDeliveryStatus;
  processedAt: string;
  providerRef?: string;
  errorCode?: string;
}

export interface IApi {
  fetchNotification(eventId: string): Promise<NotificationDelivery>;
  createNotification(payload: CreateNotificationDeliveryPayload): Promise<void>;
}

export const IApi = Symbol('IApi');
