import { Test, TestingModule } from '@nestjs/testing';
import { MessageQueueService } from '../message-queue/message-queue.service.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { IApi } from '../api/api.contract.js';
import { INotificationChannel } from './channels/channel.interface.js';
import { NotificationReceiptConflict } from '../api/api.errors.js';
import { NotificationError } from '../errors/notification-error.js';
import { DisputeResolvedEvent } from '../types.js';
import {
  FakeApi,
  FakeChannel,
  FakeMessageQueueService,
  message,
  rmqContext,
} from '../../test/support/fakes.js';

const event: DisputeResolvedEvent = {
  eventId: 'evt-1',
  eventType: 'DISPUTE_RESOLVED',
  occurredAt: '2026-01-01T00:00:00.000Z',
  disputeId: 'disp-1',
  customerId: 'cust-1',
  outcome: 'SUPPORTED',
  correlationId: 'corr-1',
};

describe('NotificationController', () => {
  let controller: NotificationController;
  let api: FakeApi;
  let channel: FakeChannel;
  let queue: FakeMessageQueueService;

  beforeEach(async () => {
    api = new FakeApi();
    channel = new FakeChannel();
    queue = new FakeMessageQueueService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        NotificationService,
        { provide: IApi, useValue: api },
        { provide: INotificationChannel, useValue: channel },
        { provide: MessageQueueService, useValue: queue },
      ],
    }).compile();

    controller = module.get(NotificationController);
  });

  const notify = (
    msg = message('{}'),
    overrides: Partial<DisputeResolvedEvent> = {},
  ) =>
    controller.notifyDisputeResolved(
      { ...event, ...overrides },
      rmqContext(msg).context,
    );

  it('acks the message on success without retrying', async () => {
    await notify();

    expect(channel.sent).toHaveLength(1);
    expect(api.createCalls).toHaveLength(1);
    expect(queue.acked).toHaveLength(1);
    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(0);
  });

  it('retries when a retryable API error occurs and attempts remain', async () => {
    api.createError = new NotificationError(
      'rate limited',
      'RATE_LIMITED',
      true,
    );

    const msg = message('{}');
    await notify(msg);

    expect(queue.retried).toEqual([{ eventId: 'evt-1', message: msg }]);
    expect(queue.dlq).toHaveLength(0);
    expect(queue.acked).toHaveLength(0);
    expect(channel.sent).toHaveLength(1);
  });

  it('retries unknown (non-NotificationError) errors since they default to retryable', async () => {
    api.createError = new TypeError('socket hang up');

    await notify();

    expect(queue.retried).toHaveLength(1);
    expect(queue.dlq).toHaveLength(0);
  });

  it('dead-letters a receipt conflict without retrying or marking failed', async () => {
    api.createError = new NotificationReceiptConflict('evt-1');

    await notify();

    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(1);
    expect(queue.acked).toHaveLength(0);
    expect(api.createCalls).toHaveLength(1);
  });

  it('marks delivery failed and sends to DLQ on non-retryable errors', async () => {
    api.createError = new NotificationError('bad request', 'BAD_REQUEST', false);

    await notify();

    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(1);
    expect(api.createCalls).toHaveLength(2);
    expect(api.createCalls[1]).toMatchObject({
      status: 'FAILED',
      errorCode: 'BAD_REQUEST',
    });
  });

  it('sends to DLQ when retries are exhausted even for retryable errors', async () => {
    api.createError = new TypeError('timeout');
    queue.exceedsRetries = true;

    await notify();

    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(1);
    expect(api.createCalls[1]?.errorCode).toBe('UNKNOWN_ERROR');
  });

  it('still DLQs the message when markDeliveryFailed itself fails', async () => {
    api.createError = new NotificationError('nope', 'NOPE', false);

    await notify();

    expect(queue.dlq).toHaveLength(1);
  });
});
