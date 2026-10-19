import { HttpApiService } from './http-api.service.js';
import {
  NotificationDeliveryCreationError,
  NotificationDeliveryError,
  NotificationDeliveryNotFound,
} from './api.errors.js';
import { requestContext } from '../interceptors/correlation.interceptor.js';
import { fakeConfig } from '../../test/support/fakes.js';

const config = fakeConfig({
  BACKEND_API_BASE_URL: 'http://backend.test',
  BACKEND_AUTHORIZATION_KEY: 'secret-key',
});

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

describe('HttpApiService.fetchNotification', () => {
  it('GETs the delivery with correlation and auth headers and a timeout', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(200, { event_id: 'evt-1' }));

    const result = await withCorrelation('corr-1', () =>
      service.fetchNotification('evt-1'),
    );

    expect(result).toEqual({ event_id: 'evt-1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://backend.test/notifications/evt-1');
    expect(init.headers).toMatchObject({
      Authentication: 'secret-key',
      'X-Correlation-Id': 'corr-1',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends an undefined correlation header when no request context exists', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(200, { event_id: 'evt-1' }));

    await service.fetchNotification('evt-1');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers['X-Correlation-Id']).toBeUndefined();
  });

  it('maps 404 to NotificationDeliveryNotFound', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(404));

    await expect(service.fetchNotification('evt-1')).rejects.toThrow(
      NotificationDeliveryNotFound,
    );
  });

  it('maps other error statuses to a retryable NotificationDeliveryError', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(503));

    const error = await service
      .fetchNotification('evt-1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationDeliveryError);
    expect((error as NotificationDeliveryError).status).toBe(503);
    expect((error as NotificationDeliveryError).retryable).toBe(true);
  });

  it('treats network failures as retryable status-null errors', async () => {
    const service = setup();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const error = await service
      .fetchNotification('evt-1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationDeliveryError);
    expect((error as NotificationDeliveryError).status).toBeNull();
    expect((error as NotificationDeliveryError).retryable).toBe(true);
  });
});

describe('HttpApiService.createNotification', () => {
  const payload = {
    eventId: 'evt-1',
    disputeId: 'disp-1',
    channel: 'WEB',
    status: 'DELIVERED' as const,
    processedAt: '2026-01-01T00:00:00.000Z',
    providerRef: 'prov-1',
  };

  it('POSTs the payload with the event id as idempotency key', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(201));

    await withCorrelation('corr-1', () => service.createNotification(payload));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://backend.test/notifications');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authentication: 'secret-key',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'evt-1',
      'X-Correlation-Id': 'corr-1',
    });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('treats 409 as success because the backend deduplicates by idempotency key', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(409));

    await expect(service.createNotification(payload)).resolves.toBeUndefined();
  });

  it('maps other error statuses to NotificationDeliveryCreationError', async () => {
    const service = setup();
    fetchMock.mockResolvedValue(jsonResponse(500));

    const error = await service
      .createNotification(payload)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotificationDeliveryCreationError);
    expect((error as NotificationDeliveryCreationError).status).toBe(500);
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
