import type { LifecycleStepState } from '@/components/ui/LifecycleStep';
import type { Dispute, DisputeStatus } from '@/types/dispute';

/** The phases a case travels through, in order. */
export type LifecyclePhase = 'submitted' | 'validated' | 'analystReview' | 'decided';

export interface LifecycleStepView {
  phase: LifecyclePhase;
  label: string;
  description: string;
  state: LifecycleStepState;
}

const phaseOrder: readonly LifecyclePhase[] = ['submitted', 'validated', 'analystReview', 'decided'];

/** The phase a status belongs to. */
const phaseByStatus: Record<DisputeStatus, LifecyclePhase> = {
  SUBMITTED: 'submitted',
  IN_REVIEW: 'validated',
  AWAITING_ANALYST: 'analystReview',
  RESOLVED_DUPLICATE_SUPPORTED: 'decided',
  RESOLVED_NOT_SUPPORTED: 'decided',
  TIMEOUT_REVIEW_REQUIRED: 'analystReview',
  REJECTED_INELIGIBLE: 'decided',
};

const finalStatuses: readonly DisputeStatus[] = [
  'RESOLVED_DUPLICATE_SUPPORTED',
  'RESOLVED_NOT_SUPPORTED',
  'REJECTED_INELIGIBLE',
];

const stepDefinitions: Record<LifecyclePhase, { label: string; description: string }> = {
  submitted: {
    label: 'Submitted',
    description: 'The case was accepted and queued for validation.',
  },
  validated: {
    label: 'Validated',
    description: 'Both transactions were eligible and were compared against the duplicate rules.',
  },
  analystReview: {
    label: 'Analyst review',
    description: 'An analyst reviews the case when the rules cannot decide it on their own.',
  },
  decided: {
    label: 'Decision',
    description: 'The final decision was recorded and the case was closed.',
  },
};

const rejectedStep = {
  label: 'Rejected',
  description: 'The case did not meet the eligibility rules, so no decision was taken.',
};

/**
 * Builds the lifecycle of a case.
 *
 * A case that was decided automatically never needed an analyst, so that step
 * is reported as skipped rather than as completed.
 */
export function buildLifecycle(dispute: Dispute): LifecycleStepView[] {
  const currentPhase = phaseByStatus[dispute.status];
  const isFinal = finalStatuses.includes(dispute.status);
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const isException = dispute.status === 'TIMEOUT_REVIEW_REQUIRED';
  const skippedAnalystReview =
    dispute.status === 'REJECTED_INELIGIBLE' || dispute.decision?.decisionSource === 'AUTOMATED';

  return phaseOrder.map((phase, index) => {
    const state = stepState({ phase, index, currentIndex, isException, skippedAnalystReview, isFinal });
    const definition =
      phase === 'decided' && dispute.status === 'REJECTED_INELIGIBLE' ? rejectedStep : stepDefinitions[phase];

    return { phase, label: definition.label, description: definition.description, state };
  });
}

function stepState({
  phase,
  index,
  currentIndex,
  isException,
  skippedAnalystReview,
  isFinal,
}: {
  phase: LifecyclePhase;
  index: number;
  currentIndex: number;
  isException: boolean;
  skippedAnalystReview: boolean;
  isFinal: boolean;
}): LifecycleStepState {
  if (isException && phase === 'analystReview') return 'exception';
  if (phase === 'analystReview' && skippedAnalystReview && index < currentIndex) return 'skipped';
  if (index < currentIndex) return 'done';
  if (index === currentIndex) {
    return isFinal ? 'done' : 'current';
  }
  return 'pending';
}
