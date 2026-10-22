import { DisputeDecisionSummary } from '@/components/disputes/DisputeDecisionSummary';
import { disputeStatusMeta } from '@/components/disputes/meta';
import type { DisputeDecision, DisputeStatus } from '@/types/dispute';

/** Outcome of a decision, shown in place of the decision form. */
export function AnalystDecisionOutcome({
  decision,
  status,
}: {
  decision: DisputeDecision;
  status: DisputeStatus;
}) {
  return (
    <section aria-labelledby="analyst-outcome-heading" className="space-y-3">
      <h2 id="analyst-outcome-heading" className="text-lg font-semibold text-gray-900">
        Decision recorded
      </h2>
      <p className="text-sm text-gray-600">
        The case is now {disputeStatusMeta[status].label.toLowerCase()}. The customer sees this
        outcome in My Disputes.
      </p>
      <DisputeDecisionSummary decision={decision} />
    </section>
  );
}
