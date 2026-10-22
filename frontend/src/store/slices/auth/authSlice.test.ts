import { describe, expect, it } from 'vitest';
import {
  AUTH_STORAGE_KEY,
  authSlice,
  canAccess,
  fallbackFor,
  landingFor,
  readStoredSession,
  selectIsAuthenticated,
  selectRole,
  signedIn,
  signedOut,
  type AuthSession,
} from './authSlice';

const session: AuthSession = {
  username: 'customer01',
  password: 'demo',
  displayName: 'Demo Customer 01',
  role: 'CUSTOMER',
  customerId: '11111111-1111-4111-8111-111111111111',
};

describe('authSlice', () => {
  it('keeps the signed-in user and persists it for the tab', () => {
    const state = authSlice.reducer(undefined, signedIn(session));

    expect(selectIsAuthenticated({ auth: state })).toBe(true);
    expect(selectRole({ auth: state })).toBe('CUSTOMER');
    expect(JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) ?? 'null')).toEqual(session);
  });

  it('clears the user and the stored session', () => {
    const signedInState = authSlice.reducer(undefined, signedIn(session));
    const state = authSlice.reducer(signedInState, signedOut());

    expect(selectIsAuthenticated({ auth: state })).toBe(false);
    expect(selectRole({ auth: state })).toBeNull();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('reads a stored session and ignores a corrupt one', () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    expect(readStoredSession()).toEqual(session);

    sessionStorage.setItem(AUTH_STORAGE_KEY, '{"username":42}');
    expect(readStoredSession()).toBeNull();
  });
});

describe('access rules', () => {
  it('sends each role to its landing page', () => {
    expect(landingFor('CUSTOMER')).toBe('/disputes');
    expect(landingFor('DISPUTE_ANALYST')).toBe('/analyst');
    expect(landingFor(null)).toBe('/disputes');
  });

  it('lets a role open only its own area', () => {
    expect(canAccess('CUSTOMER', '/disputes/b2000000-0000-4000-8000-000000000001')).toBe(true);
    expect(canAccess('CUSTOMER', '/analyst')).toBe(false);
    expect(canAccess('DISPUTE_ANALYST', '/analyst/tasks/d4000000-0000-4000-8000-000000000001')).toBe(
      true,
    );
    expect(canAccess('DISPUTE_ANALYST', '/disputes')).toBe(false);
    expect(canAccess('CUSTOMER', '/')).toBe(true);
  });

  it('falls back to the landing page when the target is not allowed', () => {
    expect(fallbackFor('CUSTOMER', '/analyst')).toBe('/disputes');
    expect(fallbackFor('DISPUTE_ANALYST', '/disputes')).toBe('/analyst');
    expect(fallbackFor('CUSTOMER', '/disputes')).toBe('/disputes');
  });
});
