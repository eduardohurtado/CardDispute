import {
  DUPLICATED_RESOLVED_MESSAGE,
  NOT_SUPPORTED_RESOLVED_MESSAGE,
  NotificationService,
} from './notification.service.js';
import { DisputeResolvedEvent } from '../types.js';
import { NotificationError } from '../errors/notification-error.js';
import { FakeApi, FakeChannel } from '../../test/support/fakes.js';

const event: DisputeResolvedEvent = {
  eventId: 'evt-1',
  eventType: 'DISPUTE_RESOLVED',
  occurredAt: '2026-01-01T00:00:00.000Z',
  disputeId: 'disp-1',
  customerId: 'cust-1',
  outcome: 'SUPPORTED',
  correlationId: 'corr-1',
};

const setup = () => {
  const api = new FakeApi();
  const channel = new FakeChannel();
  const service = new NotificationService(channel, api);
  return { api, channel, service };
};

describe('NotificationService.handleDisputeResolved', () => {
  it.each([
    ['SUPPORTED', DUPLICATED_RESOLVED_MESSAGE],
    ['NOT_SUPPORTED', NOT_SUPPORTED_RESOLVED_MESSAGE],
  ] as const)(
    'sends the message matching outcome %s',
    async (outcome, expectedBody) => {
      const { api, channel, service } = setup();

      await service.handleDisputeResolved({ ...event, outcome });

      expect(channel.sent).toEqual([
        {
          subject: 'Your dispute disp-1 has been resolved',
          body: expectedBody,
        },
      ]);
      expect(api.createCalls).toHaveLength(1);
    },
  );

  it('records a DELIVERED delivery with the MOCK_EMAIL channel and event data', async () => {
    const { api, service } = setup();

    await service.handleDisputeResolved(event);

    expect(api.createCalls).toHaveLength(1);
    const payload = api.createCalls[0]!;
    expect(payload).toMatchObject({
      channel: 'MOCK_EMAIL',
      status: 'DELIVERED',
      disputeId: 'disp-1',
      eventId: 'evt-1',
      processedAt: event.occurredAt,
    });
    expect(payload.providerRef).toBeUndefined();
  });
});

describe('NotificationService.markDeliveryFailed', () => {
  it('maps NotificationError code into the FAILED payload', async () => {
    const { api, service } = setup();

    await service.markDeliveryFailed(
      event,
      new NotificationError('x', 'RECEIPT_CONFLICT', false),
    );

    expect(api.createCalls[0]).toMatchObject({
      channel: 'MOCK_EMAIL',
      status: 'FAILED',
      errorCode: 'RECEIPT_CONFLICT',
      eventId: 'evt-1',
      processedAt: event.occurredAt,
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
