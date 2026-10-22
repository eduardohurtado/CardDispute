import { describe, expect, it } from 'vitest';
import { makeStore } from '@/store';
import { selectCurrentUser, selectUsername, switchDemoUser } from './sessionSlice';

describe('sessionSlice', () => {
  it('starts as the first demo customer', () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    expect(selectUsername(store.getState())).toBe('customer01');
    expect(selectCurrentUser(store.getState()).displayName).toBe('Demo Customer 01');
  });

  it('switches to another demo user', () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    store.dispatch(switchDemoUser('customer02'));

    expect(selectCurrentUser(store.getState()).username).toBe('customer02');
  });

  it('ignores an unknown user', () => {
    const store = makeStore(undefined, { refetchOnFocus: false });

    store.dispatch(switchDemoUser('nobody'));

    expect(selectUsername(store.getState())).toBe('customer01');
  });
});
