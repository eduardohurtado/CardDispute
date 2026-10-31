import { HttpApiService } from './http-api.service.js';
import {
  NotificationDeliveryCreationError,
  NotificationReceiptConflict,
} from './api.errors.js';
import { requestContext } from '../interceptors/correlation.interceptor.js';
import { fakeConfig } from '../../test/support/fakes.js';

const config = fakeConfig({
  BACKEND_API_BASE_URL: 'http://backend.test/',
  BACKEND_BASIC_AUTH_USERNAME: 'notification-worker',
  BACKEND_BASIC_AUTH_PASSWORD: 'secret-password',
});

const authorization = `Basic ${Buffer.from(
  'notification-worker:secret-password',
).toString('base64')}`;

const jsonResponse = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fetchMock = vi.fn();

const setup = () => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  return new HttpApiService(config);
};

const withCorrelation = <T>(
  correlationId: string,
  fn: () => Promise<T>,
): Promise<T> => requestContext.run({ correlationId }, fn);

describe('HttpApiService.createNotification', () => {
  const payload = {
    eventId: 'evt-1',
    disputeId: 'disp-1',
    channel: 'MOCK_EMAIL' as const,
    status: 'DELIVERED' as const,
    processedAt: '2026-01-01T00:00:00.000Z',
  };

  it('POSTs the payload with Basic auth and correlation headers', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(201));

    await withCorrelation('corr-1', () => service.createNotification(payload));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      'http://backend.test/internal/v1/notification-receipts',
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: authorization,
      'Content-Type': 'application/json',
      'X-Correlation-Id': 'corr-1',
    });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('sends an undefined correlation header when no request context exists', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(201));

    await service.createNotification(payload);

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers['X-Correlation-Id']).toBeUndefined();
  });

  it('treats 200 as success for an identical replay', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(200));

    await expect(
      service.createNotification(payload),
    ).resolves.toBeUndefined();
  });

  it('treats 201 as success for a new receipt', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(201));

    await expect(
      service.createNotification(payload),
    ).resolves.toBeUndefined();
  });

  it('maps 409 to a non-retryable receipt conflict', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(409));

    const error = await service
      .createNotification(payload)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationReceiptConflict);
    expect((error as NotificationReceiptConflict).status).toBe(409);
    expect((error as NotificationReceiptConflict).retryable).toBe(false);
  });

  it('maps other non-retryable statuses to creation errors', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(400));

    const error = await service
      .createNotification(payload)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationDeliveryCreationError);
    expect((error as NotificationDeliveryCreationError).status).toBe(400);
    expect((error as NotificationDeliveryCreationError).retryable).toBe(false);
  });

  it('maps retryable statuses to retryable creation errors', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(503));

    const error = await service
      .createNotification(payload)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationDeliveryCreationError);
    expect((error as NotificationDeliveryCreationError).status).toBe(503);
    expect((error as NotificationDeliveryCreationError).retryable).toBe(true);
  });

  it('wraps network failures as retryable creation errors', async () => {
    const service = setup();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const error = await service
      .createNotification(payload)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationDeliveryCreationError);
    expect((error as NotificationDeliveryCreationError).status).toBeNull();
    expect((error as NotificationDeliveryCreationError).retryable).toBe(true);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
