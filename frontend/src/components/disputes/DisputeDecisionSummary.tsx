import { Fact } from '@/components/ui/Fact';
import { Facts } from '@/components/ui/Facts';
import { StateBlock } from '@/components/ui/StateBlock';
import type { Dispute } from '@/types/dispute';
import { formatDateTime } from '@/utils/format';
import { decisionLabel, decisionSourceLabel } from './meta';

/** The final decision of the case, or a placeholder while it is pending. */
export function DisputeDecisionSummary({ dispute }: { dispute: Dispute }) {
  const decision = dispute.decision;

  if (!decision) {
    return (
      <StateBlock
        title="Decision pending"
        description="This case has no final decision yet. The outcome appears here as soon as the review finishes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Facts>
        <Fact label="Outcome">{decisionLabel(decision.decisionType)}</Fact>
        <Fact label="Decided by">{decision.decidedBy}</Fact>
        <Fact label="Decided at">{formatDateTime(decision.decidedAt)}</Fact>
        <Fact label="Source">{decisionSourceLabel(decision.decisionSource)}</Fact>
      </Facts>
      <div>
        <h3 className="text-sm font-medium text-gray-900">Rationale</h3>
        <p className="mt-1 text-sm text-gray-600">{decision.rationale}</p>
      </div>
    </div>
  );
}
