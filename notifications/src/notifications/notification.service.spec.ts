import {
  DUPLICATED_RESOLVED_MESSAGE,
  NOT_SUPPORTED_RESOLVED_MESSAGE,
  NotificationService,
} from './notification.service.js';
import { DisputeResolvedEvent } from '../types.js';
import { NotificationDeliveryNotFound } from '../api/api.errors.js';
import { NotificationError } from '../errors/notification-error.js';
import { FakeApi, FakeChannel, delivery } from '../../test/support/fakes.js';

const event: DisputeResolvedEvent = {
  eventId: 'evt-1',
  disputeId: 'disp-1',
  providerRef: 'prov-1',
  outcome: 'SUPPORTED',
};

const setup = () => {
  const api = new FakeApi();
  const channel = new FakeChannel();
  const service = new NotificationService(channel, api);
  return { api, channel, service };
};

describe('NotificationService.handleDisputeResolved', () => {
  it('short-circuits when delivery already exists as DELIVERED', async () => {
    const { api, channel, service } = setup();
    api.deliveries.set('evt-1', delivery({ status: 'DELIVERED' }));

    await service.handleDisputeResolved(event);

    expect(channel.sent).toHaveLength(0);
    expect(api.createCalls).toHaveLength(0);
  });

  it('proceeds when no delivery exists yet (404)', async () => {
    const { api, channel, service } = setup();
    api.fetchError = new NotificationDeliveryNotFound('evt-1');

    await service.handleDisputeResolved(event);

    expect(channel.sent).toHaveLength(1);
  });

  it('rethrows unexpected fetch errors without sending', async () => {
    const { api, channel, service } = setup();
    api.fetchError = new NotificationError('boom', 'BOOM', true);

    await expect(service.handleDisputeResolved(event)).rejects.toThrow('boom');
    expect(channel.sent).toHaveLength(0);
    expect(api.createCalls).toHaveLength(0);
  });

  it.each([
    ['SUPPORTED', DUPLICATED_RESOLVED_MESSAGE],
    ['NOT_SUPPORTED', NOT_SUPPORTED_RESOLVED_MESSAGE],
    ['TIMEOUT', NOT_SUPPORTED_RESOLVED_MESSAGE],
  ] as const)(
    'sends the message matching outcome %s',
    async (outcome, expectedBody) => {
      const { api, channel, service } = setup();
      api.fetchError = new NotificationDeliveryNotFound('evt-1');

      await service.handleDisputeResolved({ ...event, outcome });

      expect(channel.sent).toEqual([
        {
          subject: 'Your dispute disp-1 has been resolved',
          body: expectedBody,
        },
      ]);
    },
  );

  it('records a DELIVERED delivery with the WEB channel and event data', async () => {
    const { api, service } = setup();
    api.fetchError = new NotificationDeliveryNotFound('evt-1');

    await service.handleDisputeResolved(event);

    expect(api.createCalls).toHaveLength(1);
    const payload = api.createCalls[0]!;
    expect(payload).toMatchObject({
      channel: 'WEB',
      status: 'DELIVERED',
      disputeId: 'disp-1',
      eventId: 'evt-1',
      providerRef: 'prov-1',
    });
    expect(() => new Date(payload.processedAt).toISOString()).not.toThrow();
  });
});

describe('NotificationService.markDeliveryFailed', () => {
  it('maps NotificationError code into the FAILED payload', async () => {
    const { api, service } = setup();

    await service.markDeliveryFailed(
      event,
      new NotificationError('x', 'DELIVERY_FETCH_FAILED', false),
    );

    expect(api.createCalls[0]).toMatchObject({
      status: 'FAILED',
      errorCode: 'DELIVERY_FETCH_FAILED',
      eventId: 'evt-1',
    });
  });

  it('falls back to UNKNOWN_ERROR for non-NotificationError values', async () => {
    const { api, service } = setup();

    await service.markDeliveryFailed(event, new TypeError('whatever'));

    expect(api.createCalls[0]?.errorCode).toBe('UNKNOWN_ERROR');
  });

  it('swallows recording failures so the caller can still DLQ', async () => {
    const { api, service } = setup();
    api.createError = new NotificationError('down', 'DOWN', true);

    await expect(
      service.markDeliveryFailed(event, new Error('original')),
    ).resolves.toBeUndefined();
  });
});
