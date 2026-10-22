/**
 * Domain types for the customer dispute tracking slice (FE-2, POC-08).
 *
 * They mirror the backend contract proposed in `docs/api/disputes-contract.md`,
 * which follows blueprint sections 7.1 (state machine), 7.2 (relational design)
 * and 7.5 (REST API contract inventory).
 */

/** Every state the dispute state machine can be in (blueprint 7.1). */
export const DISPUTE_STATUSES = [
  'SUBMITTED',
  'IN_REVIEW',
  'AWAITING_ANALYST',
  'RESOLVED_DUPLICATE_SUPPORTED',
  'RESOLVED_NOT_SUPPORTED',
  'TIMEOUT_REVIEW_REQUIRED',
  'REJECTED_INELIGIBLE',
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

/** Precomputed outcome of the automated assessment (blueprint 7.1). */
export type DisputeAssessmentOutcome = 'SUPPORTED' | 'NOT_SUPPORTED' | 'MANUAL_REVIEW';

/** Reason codes a customer can pick. Only duplicates are in scope for the POC. */
export type DisputeReasonCode = 'POSSIBLE_DUPLICATE';

export type DisputeDecisionType = 'DUPLICATE_SUPPORTED' | 'NOT_SUPPORTED';

export type DisputeDecisionSource = 'AUTOMATED' | 'ANALYST';

export type TransactionStatus = 'POSTED' | 'PENDING' | 'REVERSED';

/**
 * Audit event kinds. The backend may add more, so unknown values are kept
 * instead of being rejected.
 */
export type TimelineEventType =
  | 'CREATED'
  | 'STATE_CHANGED'
  | 'DECIDED'
  | 'REVIEW_ASSIGNED'
  | 'REVIEW_COMPLETED'
  | 'TIMEOUT'
  | (string & {});

/** Snapshot of a synthetic card transaction (blueprint 7.2 `card_transaction`). */
export interface DisputeTransaction {
  transactionId: string;
  merchantName: string;
  /** Decimal amount. The backend sends a JSON number. */
  amount: number;
  /** ISO 4217 code, for example `COP` or `USD`. */
  currency: string;
  /** Masked card digits. Never a full PAN. */
  cardLast4: string;
  status: TransactionStatus;
  postedAt: string | null;
  occurredAt: string;
}

/** The final banking decision of a case (blueprint 7.2 `dispute_decision`). */
export interface DisputeDecision {
  decisionType: DisputeDecisionType;
  decisionSource: DisputeDecisionSource;
  rationale: string;
  decidedBy: string;
  decidedAt: string;
}

/** Row of the "My Disputes" list. The backend returns a projection, not the full case. */
export interface DisputeListItem {
  disputeId: string;
  transactionId: string;
  merchantName: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt: string | null;
}

/** A customer dispute case (blueprint 7.2 `dispute_case`). */
export interface Dispute {
  /** UUID. This is the case reference shown to the customer. */
  disputeId: string;
  customerId: string;
  reasonCode: DisputeReasonCode;
  description: string | null;
  status: DisputeStatus;
  assessmentOutcome: DisputeAssessmentOutcome | null;
  /** The transaction the customer disputes. */
  transaction: DisputeTransaction;
  /** The suspected duplicate, when the customer or the engine identified one. */
  candidateTransaction: DisputeTransaction | null;
  decision: DisputeDecision | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/** One entry of the business audit trail (blueprint 7.2 `dispute_audit_event`). */
export interface TimelineEvent {
  eventId: string;
  eventType: TimelineEventType;
  oldStatus: DisputeStatus | null;
  newStatus: DisputeStatus | null;
  actorId: string;
  correlationId: string;
  details: string | null;
  occurredAt: string;
}

/** Envelope for paged list endpoints, as the backend serializes a Spring `Page`. */
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** RFC 9457 Problem Details payload used for every error response. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/** Query parameters accepted by the dispute list endpoint. */
export interface DisputeListQuery {
  status?: DisputeStatus;
  page?: number;
  size?: number;
}
