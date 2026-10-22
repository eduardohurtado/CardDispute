import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { basicAuthHeader } from '@/config/demoUsers';
import type { SessionState } from '@/store/slices/session/sessionSlice';

/**
 * Single RTK Query API for the whole app.
 * Features add their endpoints with `baseApi.injectEndpoints({ ... })`
 * and declare any cache tags they use in `tagTypes` below.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? '/api',
    prepareHeaders: (headers, { getState }) => {
      // The backend authenticates the synthetic demo users with HTTP Basic and
      // takes the customer from the principal. Typed locally to avoid a
      // circular import with store.ts.
      const { session } = getState() as { session: SessionState };
      headers.set('Authorization', basicAuthHeader(session.username));
      return headers;
    },
  }),
  tagTypes: ['Dispute', 'Transaction'],
  endpoints: () => ({}),
});
