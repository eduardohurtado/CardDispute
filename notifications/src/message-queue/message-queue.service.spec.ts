import { MessageQueueService, backoffMs } from './message-queue.service.js';
import { Channel } from 'amqplib';
import { fakeConfig, message } from '../../test/support/fakes.js';

const configValues = {
  RETRY_LIMIT: 3,
  RABBITMQ_QUEUE_NAME: 'notifications',
  RETRY_BASE_DELAY_MS: 2000,
};

const setup = () => {
  const service = new MessageQueueService(fakeConfig(configValues));
  const channel = {
    ack: vi.fn(),
    nack: vi.fn(),
    sendToQueue: vi.fn(),
  };
  return { service, channel, amqpChannel: channel as unknown as Channel };
};

describe('backoffMs', () => {
  it('doubles the base delay per attempt', () => {
    expect(backoffMs(2000, 1)).toBe(2000);
    expect(backoffMs(2000, 2)).toBe(4000);
    expect(backoffMs(2000, 3)).toBe(8000);
  });
});

describe('MessageQueueService.hasExceededRetries', () => {
  it.each([
    [0, false],
    [2, false],
    [3, true],
    [4, true],
  ])('attempt %i against limit 3 => %s', async (attempt, expected) => {
    const { service } = setup();
    const msg = message('{}', { 'x-current-attempt': attempt });
    await expect(service.hasExceededRetries(msg)).resolves.toBe(expected);
  });

  it('treats a missing attempt header as the first delivery', async () => {
    const { service } = setup();
    await expect(service.hasExceededRetries(message('{}'))).resolves.toBe(
      false,
    );
  });
});

describe('MessageQueueService.retry', () => {
  it('republishes to the next retry queue with an incremented attempt and backoff, then acks', async () => {
    const { service, channel, amqpChannel } = setup();
    const msg = message('payload', {
      'x-current-attempt': 1,
      'x-custom': 'kept',
    });

    await service.retry(amqpChannel, msg, 'evt-1');

    expect(channel.sendToQueue).toHaveBeenCalledOnce();
    const [queue, content, options] = channel.sendToQueue.mock.calls[0]!;
    expect(queue).toBe('notifications.retry.2');
    expect(content.toString()).toBe('payload');
    expect(options).toMatchObject({
      headers: { 'x-current-attempt': 2, 'x-custom': 'kept' },
      persistent: true,
      expiration: 4000,
    });
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('starts at attempt 1 when the header is missing', async () => {
    const { service, channel, amqpChannel } = setup();

    await service.retry(amqpChannel, message('payload'), 'evt-1');

    const [, , options] = channel.sendToQueue.mock.calls[0]!;
    expect(options.headers['x-current-attempt']).toBe(1);
    expect(options.expiration).toBe(2000);
  });
});

describe('MessageQueueService ack/DLQ', () => {
  it('marks messages as processed by acking them', async () => {
    const { service, channel, amqpChannel } = setup();
    const msg = message('{}');

    await service.markAsProcessed(amqpChannel, msg);

    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('dead-letters without requeue', async () => {
    const { service, channel, amqpChannel } = setup();
    const msg = message('{}');

    await service.sendToDLQ(amqpChannel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });
});
