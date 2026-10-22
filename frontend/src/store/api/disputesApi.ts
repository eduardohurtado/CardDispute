import type { Dispute, DisputeListQuery, PagedResponse, TimelineEvent } from '@/types/dispute';
import { baseApi } from './baseApi';

/**
 * Read-only endpoints of the customer dispute tracking slice.
 *
 * The paths carry the `v1/` prefix because the base URL stays `/api`, which
 * keeps the frontend independent of how the backend is mounted.
 */
export const disputesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** List the cases of the signed-in customer, newest first. */
    getDisputes: builder.query<PagedResponse<Dispute>, DisputeListQuery | void>({
      query: (args) => ({
        url: 'v1/disputes',
        params: args ?? {},
      }),
      providesTags: ['Dispute'],
    }),

    /** One case, with its status and decision. */
    getDispute: builder.query<Dispute, string>({
      query: (disputeId) => ({ url: `v1/disputes/${disputeId}` }),
      providesTags: ['Dispute'],
    }),

    /** The business audit trail of a case. */
    getDisputeTimeline: builder.query<TimelineEvent[], string>({
      query: (disputeId) => ({ url: `v1/disputes/${disputeId}/timeline` }),
      providesTags: ['Dispute'],
    }),
  }),
});

export const { useGetDisputesQuery, useGetDisputeQuery, useGetDisputeTimelineQuery } = disputesApi;
