import { describe, expect, it } from 'vitest';
import { makeStore } from '@/store';
import { disputesApi } from './disputesApi';

const store = makeStore(undefined, { refetchOnFocus: false });

describe('disputesApi', () => {
  it('lists the cases of the signed-in customer', async () => {
    const result = await store.dispatch(disputesApi.endpoints.getDisputes.initiate({}));

    expect(result.error).toBeUndefined();
    expect(result.data?.content).toHaveLength(5);
    expect(result.data?.totalElements).toBe(5);
    expect(result.data?.page).toBe(0);
  });

  it('filters the list by status', async () => {
    const result = await store.dispatch(
      disputesApi.endpoints.getDisputes.initiate({ status: 'AWAITING_ANALYST' }),
    );

    expect(result.data?.content).toHaveLength(1);
    expect(result.data?.content[0]?.status).toBe('AWAITING_ANALYST');
  });

  it('paginates the list', async () => {
    const result = await store.dispatch(
      disputesApi.endpoints.getDisputes.initiate({ page: 0, size: 2 }),
    );

    expect(result.data?.content).toHaveLength(2);
    expect(result.data?.totalElements).toBe(5);
    expect(result.data?.totalPages).toBe(3);
  });

  it('returns one case with its decision', async () => {
    const result = await store.dispatch(
      disputesApi.endpoints.getDispute.initiate('b2000000-0000-4000-8000-000000000001'),
    );

    expect(result.data?.status).toBe('RESOLVED_DUPLICATE_SUPPORTED');
    expect(result.data?.decision?.decisionType).toBe('DUPLICATE_SUPPORTED');
    expect(result.data?.candidateTransaction?.merchantName).toBe('Coffee Shop');
  });

  it('returns the audit trail of a case', async () => {
    const result = await store.dispatch(
      disputesApi.endpoints.getDisputeTimeline.initiate('b2000000-0000-4000-8000-000000000001'),
    );

    expect(result.data).toHaveLength(4);
    expect(result.data?.[0]?.eventType).toBe('CREATED');
  });

  it('reports a case of another customer as not found', async () => {
    const result = await store.dispatch(
      disputesApi.endpoints.getDispute.initiate('b2000000-0000-4000-8000-000000000006'),
    );

    expect(result.data).toBeUndefined();
    expect((result.error as { status?: number })?.status).toBe(404);
  });

  it('reports an unknown case as not found', async () => {
    const result = await store.dispatch(
      disputesApi.endpoints.getDispute.initiate('b2000000-0000-4000-8000-000000009999'),
    );

    expect((result.error as { status?: number })?.status).toBe(404);
  });
});
