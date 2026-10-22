import type { PageResponse } from '@/types/api';
import type { Transaction, TransactionListQuery } from '@/types/transaction';
import { baseApi } from './baseApi';

/** Synthetic card transactions of the signed-in customer (FE-1, POC-07). */
export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Owned transactions, newest first. */
    getTransactions: builder.query<PageResponse<Transaction>, TransactionListQuery | void>({
      query: (args) => ({
        url: 'v1/transactions',
        params: args ?? {},
      }),
      providesTags: ['Transaction'],
    }),

    /** One owned transaction. Foreign or unknown ids answer 404. */
    getTransaction: builder.query<Transaction, string>({
      query: (transactionId) => ({ url: `v1/transactions/${transactionId}` }),
      providesTags: ['Transaction'],
    }),
  }),
});

export const { useGetTransactionsQuery, useGetTransactionQuery } = transactionsApi;
