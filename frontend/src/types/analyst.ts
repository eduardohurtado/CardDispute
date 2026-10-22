/**
 * Domain types for the analyst workspace (FE-2, POC-11).
 *
 * They mirror the analyst contract proposed in `docs/api/analyst-contract.md`,
 * which follows blueprint sections 7.1 (state machine), 7.5 (REST contract
 * inventory) and 7.6 (analyst wireframes).
 */
import type {
  DisputeAssessmentOutcome,
  DisputeDecision,
  DisputeDecisionType,
  DisputeReasonCode,
  DisputeStatus,
  DisputeTransaction,
  PagedResponse,
  TimelineEvent,
} from '@/types/dispute';

/**
 * Queues an analyst can work through.
 *
 * `PENDING` holds the open reviews that are not due yet, `DUE_SOON` the ones
 * that are due within a day or already overdue.
 */
export const ANALYST_QUEUES = ['PENDING', 'DUE_SOON'] as const;

export type AnalystQueue = (typeof ANALYST_QUEUES)[number];

/**
 * How closely the two transactions matched.
 *
 * The values mirror the merchant comparison of the backend rules
 * (`MerchantMatch`): `EXACT`, `AMBIGUOUS` and `NONE`. `UNKNOWN` is the
 * fallback for a case whose assessment did not report a match.
 */
export const MATCH_KINDS = ['EXACT', 'AMBIGUOUS', 'NONE', 'UNKNOWN'] as const;

export type MatchKind = (typeof MATCH_KINDS)[number];

/** Result of the automated assessment, as the analyst sees it. */
export interface MatchAssessment {
  /** Precomputed outcome of the rules (blueprint 7.1). */
  outcome: DisputeAssessmentOutcome;
  /** How the two transactions matched. */
  matchKind: MatchKind;
  /** Non-sensitive explanation of the assessment. */
  explanation: string;
}

/** One row of the analyst work queue. */
export interface AnalystTaskSummary {
  /** Identifier of the workflow task. Not a case reference. */
  taskId: string;
  /** UUID of the case under review. */
  disputeId: string;
  customerId: string;
  status: DisputeStatus;
  merchantName: string;
  amount: number;
  currency: string;
  assessmentOutcome: DisputeAssessmentOutcome | null;
  matchKind: MatchKind;
  /** When the customer submitted the case. */
  submittedAt: string;
  /** When the review is due. */
  dueAt: string;
}

/** Everything an analyst needs to decide a case. */
export interface AnalystTask extends AnalystTaskSummary {
  reasonCode: DisputeReasonCode;
  /** Note the customer left with the dispute. */
  description: string | null;
  /** The transaction the customer disputes. */
  transaction: DisputeTransaction;
  /** The duplicate the rules matched, when they found one. */
  candidateTransaction: DisputeTransaction | null;
  assessment: MatchAssessment | null;
  /** The decision of a task that was already completed. */
  decision: DisputeDecision | null;
  /** Short read-only history of the case. */
  timeline: TimelineEvent[];
}

/** Paged work queue plus the size of every queue, for the tab counters. */
export interface AnalystTaskPage extends PagedResponse<AnalystTaskSummary> {
  queueCounts: Record<AnalystQueue, number>;
}

/** Body of the analyst decision request. */
export interface AnalystDecisionRequest {
  decision: DisputeDecisionType;
  /** Mandatory justification. The customer reads it. */
  rationale: string;
}

/** Query parameters of the work queue endpoint. */
export interface AnalystTaskListQuery {
  queue?: AnalystQueue;
  page?: number;
  size?: number;
}
