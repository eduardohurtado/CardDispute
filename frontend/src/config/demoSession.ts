/**
 * Demo identities shared by the login screen, the mock API and the auth slice.
 *
 * The backend authenticates with HTTP Basic against the synthetic users in
 * `application.security.demo-users`. There is no `/me` endpoint yet, so the
 * role and the customer id are resolved locally from this table. The backend
 * still enforces every permission: this table only drives navigation.
 *
 * Passwords are not stored here. The demo password is `demo` unless the
 * backend overrides `DEMO_USER_PASSWORD`.
 */

/** Roles the SPA knows about. Mirrors the backend `Role` enum. */
export type DemoRole = 'CUSTOMER' | 'DISPUTE_ANALYST';

export interface DemoAccount {
  username: string;
  displayName: string;
  role: DemoRole;
  /**
   * Customer id used only by the mock API. The real backend derives it from
   * the authenticated principal, so real requests never send it.
   */
  customerId?: string;
}

/** Password of every demo user unless the backend overrides it. */
export const DEMO_PASSWORD = 'demo';

/** Mock identity of customer 01. Matches the fixtures. */
export const DEMO_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

/** Mock identity of customer 02. Matches the fixtures. */
export const DEMO_CUSTOMER_02_ID = '99999999-9999-4999-8999-999999999999';

export const DEMO_CUSTOMER_HEADER = 'X-Demo-Customer-Id';
export const DEMO_ANALYST_HEADER = 'X-Demo-Analyst-Id';
export const DEMO_ANALYST_ID = 'analyst-01';

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  customer01: {
    username: 'customer01',
    displayName: 'Demo Customer 01',
    role: 'CUSTOMER',
    customerId: DEMO_CUSTOMER_ID,
  },
  customer02: {
    username: 'customer02',
    displayName: 'Demo Customer 02',
    role: 'CUSTOMER',
    customerId: DEMO_CUSTOMER_02_ID,
  },
  analyst001: {
    username: 'analyst001',
    displayName: 'Analyst 01',
    role: 'DISPUTE_ANALYST',
  },
};

/** Account for a username, falling back to a customer for unknown users. */
export function accountFor(username: string): DemoAccount {
  return (
    DEMO_ACCOUNTS[username] ?? {
      username,
      displayName: username,
      role: 'CUSTOMER',
    }
  );
}

/** Usernames shown as a hint on the login screen. */
export const DEMO_USERNAMES = Object.keys(DEMO_ACCOUNTS);

/** Encodes HTTP Basic credentials. Only ASCII demo values are supported. */
export function basicAuthorization(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}
