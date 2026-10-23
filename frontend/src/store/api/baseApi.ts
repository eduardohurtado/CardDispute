import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { isMockApi } from '@/config/apiMode';
import { basicAuthorization, DEMO_CUSTOMER_HEADER } from '@/config/demoSession';
import { selectSession, signedOut, type AuthState } from '@/store/slices/auth/authSlice';

/**
 * Single RTK Query API for the whole app.
 * Features add their endpoints with `baseApi.injectEndpoints({ ... })`
 * and declare any cache tags they use in `tagTypes` below.
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  prepareHeaders: (headers, { getState }) => {
    const session = selectSession(getState() as { auth: AuthState });

    if (session) {
      // HTTP Basic: the backend has no token endpoint, so the credentials
      // travel on every request.
      headers.set('Authorization', basicAuthorization(session.username, session.password));
    }

    if (isMockApi && session?.customerId) {
      // The mock API has no principal, so it scopes data from this header.
      headers.set(DEMO_CUSTOMER_HEADER, session.customerId);
    }

    return headers;
  },
});

/** Clears an expired session: any 401 sends the user back to the login screen. */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(signedOut());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Transaction", 'Dispute', 'AnalystTask'],
  endpoints: () => ({}),
});
