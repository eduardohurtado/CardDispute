/**
 * Synthetic demo identities.
 *
 * They match `application.security.demo-users` in the backend `application.yml`.
 * The backend authenticates them with HTTP Basic and takes the customer id from
 * the principal, never from the request. These are not real credentials.
 */

export type DemoRole = 'CUSTOMER' | 'DISPUTE_ANALYST';

export interface DemoUser {
  username: string;
  displayName: string;
  role: DemoRole;
  /**
   * Customer id used only by the local mock API (src/mocks) to scope data.
   * The real backend maps the username to its own customer id.
   */
  mockCustomerId: string;
}

export const DEMO_USERS: readonly DemoUser[] = [
  {
    username: 'customer001',
    displayName: 'Demo Customer 01',
    role: 'CUSTOMER',
    mockCustomerId: '11111111-1111-4111-8111-111111111111',
  },
  {
    username: 'customer002',
    displayName: 'Demo Customer 02',
    role: 'CUSTOMER',
    mockCustomerId: '99999999-9999-4999-8999-999999999999',
  },
  {
    username: 'analyst001',
    displayName: 'Analyst 01',
    role: 'DISPUTE_ANALYST',
    mockCustomerId: '',
  },
];

export const DEFAULT_DEMO_USER: DemoUser = DEMO_USERS[0]!;

export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'demo';

export function findDemoUser(username: string | null | undefined): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.username === username);
}

/** Value of the `Authorization` header for a demo user. */
export function basicAuthHeader(username: string, password: string = DEMO_PASSWORD): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}