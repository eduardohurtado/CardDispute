import type { Dispute } from '@/types/dispute';
import type { CreateDisputeRequest } from '@/types/transaction';
import { baseApi } from './baseApi';

/** Customer dispute submission (FE-1, POC-07). */
export const disputeSubmissionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Submit a possible duplicate charge. Answers 201 with the new case. */
    createDispute: builder.mutation<Dispute, CreateDisputeRequest>({
      query: (body) => ({ url: 'v1/disputes', method: 'POST', body }),
      // Refreshes My Disputes and any open case views.
      invalidatesTags: ['Dispute'],
    }),
  }),
});

export const { useCreateDisputeMutation } = disputeSubmissionApi;
