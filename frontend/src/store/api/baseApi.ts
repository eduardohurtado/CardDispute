import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { DEMO_CUSTOMER_HEADER, DEMO_CUSTOMER_ID } from '@/config/demoSession';

/**
 * Single RTK Query API for the whole app.
 * Features add their endpoints with `baseApi.injectEndpoints({ ... })`
 * and declare any cache tags they use in `tagTypes` below.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? '/api',
    prepareHeaders: (headers) => {
      // Temporary stand-in for the authenticated customer. The backend must
      // enforce ownership on its side, see src/config/demoSession.ts.
      headers.set(DEMO_CUSTOMER_HEADER, DEMO_CUSTOMER_ID);
      return headers;
    },
  }),
  tagTypes: ['Dispute'],
  endpoints: () => ({}),
});
