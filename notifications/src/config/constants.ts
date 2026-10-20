export const NOTIFICATION_TOPIC_V1 = 'dispute.resolved.v1';
export const RETRY_LIMIT = 3;
export const RETRY_BASE_DELAY_MS = 2000;

export const retryQueueName = (queue: string, attempt: number) =>
  `${queue}.retry.${attempt}`;
