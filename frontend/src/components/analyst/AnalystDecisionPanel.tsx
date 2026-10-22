import { useState } from 'react';
import { useAppDispatch } from '@/store';
import { useSubmitAnalystDecisionMutation } from '@/store/api/analystApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import type { Dispute } from '@/types/dispute';
import type { AnalystDecisionRequest, AnalystTask } from '@/types/analyst';
import { AnalystDecisionForm } from './AnalystDecisionForm';
import { AnalystDecisionOutcome } from './AnalystDecisionOutcome';
import { describeAnalystError } from './errors';

export interface AnalystDecisionPanelProps {
  /** The task the analyst is deciding. */
  task: AnalystTask;
}

/**
 * Decision area of the review page.
 *
 * It owns the mutation and shows the outcome in place of the form, so the
 * analyst sees the result of the decision without leaving the page.
 */
export function AnalystDecisionPanel({ task }: AnalystDecisionPanelProps) {
  const dispatch = useAppDispatch();
  const [outcome, setOutcome] = useState<Dispute | null>(null);
  const [submitDecision, { isLoading, error }] = useSubmitAnalystDecisionMutation();

  async function handleSubmit(values: AnalystDecisionRequest) {
    try {
      const decided = await submitDecision({ taskId: task.taskId, ...values }).unwrap();
      setOutcome(decided);
      dispatch(showToast('Decision recorded.', 'success'));
    } catch (failure) {
      dispatch(showToast(describeAnalystError(failure, 'We could not save the decision.'), 'error'));
    }
  }

  const decided = outcome?.decision ?? task.decision;
  const decidedStatus = outcome?.status ?? task.status;

  if (decided) {
    return <AnalystDecisionOutcome decision={decided} status={decidedStatus} />;
  }

  return (
    <AnalystDecisionForm
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitError={error ? describeAnalystError(error, 'We could not save the decision.') : null}
    />
  );
}
