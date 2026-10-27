/**
 * Domain types for the analyst workspace.
 * Aligned to backend ReviewTaskController contract.
 */
import type { DisputeDecisionType, PagedResponse } from "@/types/dispute";

export const ANALYST_QUEUES = ["PENDING", "DUE_SOON"] as const;

export type AnalystQueue = (typeof ANALYST_QUEUES)[number];

/** ReviewTaskResponse from backend */
export interface ReviewTaskSummary {
  taskId: string;
  disputeId: string;
  processInstanceId: string;
  taskDefinitionKey: string;
  taskName: string;
  assignee: string | null;
  createdAt: string;
  overdue: boolean;
}

/** Backwards compatible aliases */
export type AnalystTaskSummary = ReviewTaskSummary;
export type AnalystTask = ReviewTaskSummary;

/** Paged work queue */
export interface AnalystTaskPage extends PagedResponse<ReviewTaskSummary> {}

/** Body of the analyst decision request */
export interface AnalystDecisionRequest {
  disputeId: string;
  decision: DisputeDecisionType;
  /** Mandatory justification. The customer reads it. */
  rationale: string;
}

/** Query parameters of the work queue endpoint */
export interface AnalystTaskListQuery {
  page?: number;
  size?: number;
}

/** Manual review completion response */
export interface ManualReviewCompletionResponse {
  taskId: string;
  disputeId: string;
  processInstanceId: string;
  status: string;
}
