import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  accountFor,
  basicAuthorization,
  type DemoAccount,
} from '@/config/demoSession';
import { isMockApi } from '@/config/apiMode';
import { baseApi } from './baseApi';

export interface Credentials {
  username: string;
  password: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Verifies demo credentials against the backend.
 *
 * There is no `/me` endpoint, so the cheapest authenticated call is used as a
 * probe: both roles are allowed to list disputes, which makes a `200` a safe
 * "these credentials are valid" signal and a `401` a wrong password.
 *
 * With the mock API the check is local, because the handlers do not know about
 * HTTP Basic.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    verifyCredentials: builder.mutation<DemoAccount, Credentials>({
      async queryFn({ username, password }) {
        if (isMockApi) {
          return username in DEMO_ACCOUNTS && password === DEMO_PASSWORD
            ? { data: accountFor(username) }
            : { error: unauthorized() };
        }

        const response = await fetch(`${API_BASE}/v1/disputes?size=1`, {
          headers: { Authorization: basicAuthorization(username, password) },
        });

        if (response.status === 401) {
          return { error: unauthorized() };
        }

        if (!response.ok) {
          return {
            error: {
              status: response.status,
              data: await response.json().catch(() => undefined),
            },
          };
        }

        return { data: accountFor(username) };
      },
    }),
  }),
});

function unauthorized() {
  return {
    status: 401 as const,
    data: {
      title: 'Unauthorized',
      status: 401,
      detail: 'Wrong username or password.',
    },
  };
}

export const { useVerifyCredentialsMutation } = authApi;
