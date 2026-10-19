import { Test, TestingModule } from '@nestjs/testing';
import { MessageQueueService } from '../message-queue/message-queue.service.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { IApi } from '../api/api.contract.js';
import { INotificationChannel } from './channels/channel.interface.js';
import { NotificationDeliveryNotFound } from '../api/api.errors.js';
import { NotificationError } from '../errors/notification-error.js';
import { DisputeResolvedEvent } from '../types.js';
import {
  FakeApi,
  FakeChannel,
  FakeMessageQueueService,
  delivery,
  message,
  rmqContext,
} from '../../test/support/fakes.js';

const event: DisputeResolvedEvent = {
  eventId: 'evt-1',
  disputeId: 'disp-1',
  providerRef: 'prov-1',
  outcome: 'SUPPORTED',
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
    api.deliveries.set('evt-1', delivery({ status: 'DELIVERED' }));

    await notify();

    expect(queue.acked).toHaveLength(1);
    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(0);
  });

  it('retries when a retryable API error occurs and attempts remain', async () => {
    api.fetchError = new NotificationDeliveryNotFound('evt-1');
    // delivery 404 is handled inside the service; force a retryable failure
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
    api.fetchError = new TypeError('socket hang up');

    await notify();

    expect(queue.retried).toHaveLength(1);
    expect(queue.dlq).toHaveLength(0);
  });

  it('marks delivery failed and sends to DLQ on non-retryable errors', async () => {
    api.fetchError = new NotificationError('bad request', 'BAD_REQUEST', false);

    await notify();

    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(1);
    expect(api.createCalls).toHaveLength(1);
    expect(api.createCalls[0]).toMatchObject({
      status: 'FAILED',
      errorCode: 'BAD_REQUEST',
    });
  });

  it('sends to DLQ when retries are exhausted even for retryable errors', async () => {
    api.fetchError = new TypeError('timeout');
    queue.exceedsRetries = true;

    await notify();

    expect(queue.retried).toHaveLength(0);
    expect(queue.dlq).toHaveLength(1);
    expect(api.createCalls[0]?.errorCode).toBe('UNKNOWN_ERROR');
  });

  it('still DLQs the message when markDeliveryFailed itself fails', async () => {
    api.fetchError = new NotificationError('nope', 'NOPE', false);
    api.createError = new NotificationError('backend down', 'DOWN', true);

    await notify();

    expect(queue.dlq).toHaveLength(1);
  });
});
