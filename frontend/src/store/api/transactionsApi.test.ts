import { describe, expect, it } from 'vitest';
import { makeStore } from '@/store';
import { signedIn } from '@/store/slices/auth/authSlice';
import { findDemoUser, DEMO_PASSWORD } from '@/config/demoUsers';
import { transactionsApi } from './transactionsApi';

describe('transactionsApi', () => {
  it('lists only the posted transactions of the signed-in customer', async () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    const result = await store.dispatch(
      transactionsApi.endpoints.getTransactions.initiate({ status: 'POSTED' }),
    );

    const items = result.data?.content ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((transaction) => transaction.status === 'POSTED')).toBe(true);
    expect(items.map((transaction) => transaction.merchantName)).not.toContain('Panadería La 80');
  });

  it('scopes the list to the demo user', async () => {
    const store = makeStore(undefined, { refetchOnFocus: false });
    const u = findDemoUser('customer002')!;
    store.dispatch(signedIn({
      username: u.username,
      password: DEMO_PASSWORD,
      displayName: u.displayName,
      role: u.role,
      customerId: u.mockCustomerId || undefined,
    }));

    const result = await store.dispatch(transactionsApi.endpoints.getTransactions.initiate({}));

    expect(result.data?.content.map((transaction) => transaction.merchantName)).toEqual([
      'Panadería La 80',
    ]);
  });

  it('reports a transaction of another customer as not found', async () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    const result = await store.dispatch(
      transactionsApi.endpoints.getTransaction.initiate('a1000000-0000-4000-8000-000000000012'),
    );

    expect((result.error as { status?: number })?.status).toBe(404);
  });
});
