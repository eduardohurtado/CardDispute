import {
  NOTIFICATION_TOPIC_V1,
  RETRY_LIMIT,
  RETRY_BASE_DELAY_MS,
} from './constants.js';

export interface EnvVars {
  RABBITMQ_CONNECTION_STRING: string;
  RABBITMQ_QUEUE_NAME: string;
  RABBITMQ_EXCHANGE_NAME: string;
  NOTIFICATION_TOPIC_V1: string;
  RABBITMQ_ROUTING_KEY: string;
  RETRY_LIMIT: number;
  RETRY_BASE_DELAY_MS: number;
}

export function validateEnv(raw: Record<string, any>): EnvVars {
  if (!raw.RABBITMQ_CONNECTION_STRING)
    throw new Error('RABBITMQ_CONNECTION_STRING is required');
  if (!raw.RABBITMQ_QUEUE_NAME)
    throw new Error('RABBITMQ_QUEUE_NAME is required');
  if (!raw.RABBITMQ_EXCHANGE_NAME)
    throw new Error('RABBITMQ_EXCHANGE_NAME is required');
  if (!raw.RABBITMQ_ROUTING_KEY)
    throw new Error('RABBITMQ_ROUTING_KEY is required');

  return {
    RABBITMQ_CONNECTION_STRING: raw.RABBITMQ_CONNECTION_STRING,
    RABBITMQ_QUEUE_NAME: raw.RABBITMQ_QUEUE_NAME,
    RABBITMQ_EXCHANGE_NAME: raw.RABBITMQ_EXCHANGE_NAME,
    RABBITMQ_ROUTING_KEY: raw.RABBITMQ_ROUTING_KEY,
    NOTIFICATION_TOPIC_V1,
    RETRY_LIMIT,
    RETRY_BASE_DELAY_MS,
  };
}
