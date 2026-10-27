import { useState } from 'react';
import { useAppDispatch } from '@/store';
import { useSubmitAnalystDecisionMutation } from '@/store/api/analystApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import type { DisputeDecision } from '@/types/dispute';
import type { AnalystDecisionRequest, AnalystTask } from '@/types/analyst';
import { AnalystDecisionForm } from './AnalystDecisionForm';
import { AnalystDecisionOutcome } from './AnalystDecisionOutcome';
import { describeAnalystError } from './errors';

export interface AnalystDecisionPanelProps {
  task: AnalystTask;
}

export function AnalystDecisionPanel({ task }: AnalystDecisionPanelProps) {
  const dispatch = useAppDispatch();
  const [decided, setDecided] = useState<DisputeDecision | null>(null);
  const [decidedStatus, setDecidedStatus] = useState<string | null>(null);
  const [submitDecision, { isLoading, error }] = useSubmitAnalystDecisionMutation();

  async function handleSubmit(values: AnalystDecisionRequest) {
    try {
      await submitDecision({ taskId: task.taskId, disputeId: task.disputeId, ...values }).unwrap();
      const decision: DisputeDecision = {
        decisionType: values.decision,
        decisionSource: 'ANALYST',
        rationale: values.rationale,
        decidedBy: 'analyst',
        decidedAt: new Date().toISOString(),
      };
      setDecided(decision);
      setDecidedStatus(values.decision === 'DUPLICATE_SUPPORTED' ? 'RESOLVED_DUPLICATE_SUPPORTED' : 'RESOLVED_NOT_SUPPORTED');
      dispatch(showToast('Decision recorded.', 'success'));
    } catch (failure) {
      dispatch(showToast(describeAnalystError(failure, 'We could not save the decision.'), 'error'));
    }
  }

  if (decided && decidedStatus) {
    return <AnalystDecisionOutcome decision={decided} status={decidedStatus as any} />;
  }

  return (
    <AnalystDecisionForm
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitError={error ? describeAnalystError(error, 'We could not save the decision.') : null}
    />
  );
}
