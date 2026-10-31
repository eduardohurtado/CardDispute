import { Channel, Message } from 'amqplib';
import {
  CreateNotificationDeliveryPayload,
  IApi,
} from '../../src/api/api.contract.js';
import {
  INotificationChannel,
  NotificationMessage,
} from '../../src/notifications/channels/channel.interface.js';

export class FakeApi implements IApi {
  createError: unknown;
  createCalls: CreateNotificationDeliveryPayload[] = [];

  async createNotification(payload: CreateNotificationDeliveryPayload) {
    this.createCalls.push(payload);
    if (this.createError) throw this.createError;
  }
}

export class FakeChannel implements INotificationChannel {
  sent: NotificationMessage[] = [];
  sendError: unknown;

  async send(payload: NotificationMessage) {
    this.sent.push(payload);
    if (this.sendError) throw this.sendError;
  }
}

export class FakeMessageQueueService {
  acked: Message[] = [];
  retried: Array<{ eventId: string; message: Message }> = [];
  dlq: Message[] = [];
  exceedsRetries = false;
  retryError: unknown;

  async markAsProcessed(_channel: Channel, message: Message) {
    this.acked.push(message);
  }

  async hasExceededRetries(_message: Message) {
    return this.exceedsRetries;
  }

  async retry(_channel: Channel, message: Message, eventId: string) {
    if (this.retryError) throw this.retryError;
    this.retried.push({ eventId, message });
  }

  async sendToDLQ(_channel: Channel, message: Message) {
    this.dlq.push(message);
  }
}

export const fakeConfig = <T extends Record<string, unknown>>(values: T) =>
  ({
    getOrThrow: (key: string) => {
      if (!(key in values)) {
        throw new Error(`No fake config value for ${key}`);
      }
      return values[key];
    },
    get: (key: string) => values[key],
  }) as never;

export const message = (
  content: string,
  headers: Record<string, unknown> = {},
): Message =>
  ({
    content: Buffer.from(content),
    fields: {
      deliveryTag: 1,
      redelivered: false,
      exchange: '',
      routingKey: '',
      consumerTag: '',
    },
    properties: { headers, persistent: true },
  }) as unknown as Message;

type RmqChannel = {
  ack: ReturnType<typeof vi.fn>;
  nack: ReturnType<typeof vi.fn>;
  sendToQueue: ReturnType<typeof vi.fn>;
};

type RmqContext = {
  channel: RmqChannel;
  context: {
    getChannelRef: () => RmqChannel;
    getMessage: () => Message;
  };
};

export const rmqContext = (msg: Message): RmqContext => {
  const channel = {
    ack: vi.fn(),
    nack: vi.fn(),
    sendToQueue: vi.fn(),
  };
  return {
    channel,
    context: {
      getChannelRef: () => channel,
      getMessage: () => msg,
    },
  };
};
