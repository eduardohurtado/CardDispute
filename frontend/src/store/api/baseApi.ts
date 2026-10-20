import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Single RTK Query API for the whole app.
 * Features add their endpoints with `baseApi.injectEndpoints({ ... })`
 * and declare any cache tags they use in `tagTypes` below.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  }),
  tagTypes: [],
  endpoints: () => ({}),
});
