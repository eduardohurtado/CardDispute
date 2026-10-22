import type { DisputeReasonCode, TransactionStatus } from '@/types/dispute';

/** A synthetic card transaction (`TransactionResponse.java`). */
export interface Transaction {
  transactionId: string;
  /** Masked card digits. Never a full PAN. */
  cardLast4: string;
  merchantName: string;
  /** Synthetic merchant reference, when the seed data has one. */
  reference: string | null;
  /** Decimal amount. The backend sends a JSON number. */
  amount: number;
  /** ISO 4217 code, for example `COP` or `USD`. */
  currency: string;
  status: TransactionStatus;
  occurredAt: string;
  postedAt: string | null;
}

/** Query parameters accepted by `GET /api/v1/transactions`. */
export interface TransactionListQuery {
  status?: TransactionStatus;
  page?: number;
  size?: number;
}

/**
 * Body of `POST /api/v1/disputes` (`CreateDisputeRequest.java`).
 * The customer is never sent: the backend takes it from the signed-in user.
 */
export interface CreateDisputeRequest {
  transactionId: string;
  candidateTransactionId: string;
  reasonCode: DisputeReasonCode;
  description?: string;
}
