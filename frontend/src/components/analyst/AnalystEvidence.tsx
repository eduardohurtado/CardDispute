import { Badge } from '@/components/ui/Badge';
import { Fact } from '@/components/ui/Fact';
import { Facts } from '@/components/ui/Facts';
import { TransactionFacts } from '@/components/disputes/TransactionFacts';
import type { AnalystTask } from '@/types/analyst';
import { formatAmount, formatDateTime } from '@/utils/format';
import { assessmentOutcomeMeta, matchKindMeta } from './meta';

export interface AnalystEvidenceProps {
  /** The task under review. */
  task: AnalystTask;
}

/**
 * Evidence of a task: both transactions, the match assessment and the note
 * the customer left.
 */
export function AnalystEvidence({ task }: AnalystEvidenceProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="assessment-heading">
        <h2 id="assessment-heading" className="text-lg font-semibold text-gray-900">
          Match assessment
        </h2>
        {task.assessment ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={assessmentOutcomeMeta[task.assessment.outcome].tone}>
                {assessmentOutcomeMeta[task.assessment.outcome].label}
              </Badge>
              <Badge tone={matchKindMeta[task.assessment.matchKind].tone}>
                {matchKindMeta[task.assessment.matchKind].label}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-700">{task.assessment.explanation}</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            The automated rules did not produce an assessment for this case.
          </p>
        )}
      </section>

      <section aria-labelledby="evidence-transaction-heading">
        <h2 id="evidence-transaction-heading" className="text-lg font-semibold text-gray-900">
          Disputed transaction
        </h2>
        <Facts className="mt-3">
          <TransactionFacts transaction={task.transaction} />
        </Facts>
      </section>

      <section aria-labelledby="evidence-candidate-heading">
        <h2 id="evidence-candidate-heading" className="text-lg font-semibold text-gray-900">
          Suspected duplicate
        </h2>
        {task.candidateTransaction ? (
          <Facts className="mt-3">
            <TransactionFacts transaction={task.candidateTransaction} />
          </Facts>
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            No candidate transaction was identified for this case.
          </p>
        )}
      </section>

      <section aria-labelledby="evidence-case-heading">
        <h2 id="evidence-case-heading" className="text-lg font-semibold text-gray-900">
          Case
        </h2>
        <Facts className="mt-3">
          <Fact label="Case reference">
            <span className="font-mono text-xs break-all">{task.disputeId}</span>
          </Fact>
          <Fact label="Amount">{formatAmount(task.amount, task.currency)}</Fact>
          <Fact label="Merchant">{task.merchantName}</Fact>
          <Fact label="Submitted">{formatDateTime(task.submittedAt)}</Fact>
          <Fact label="Due">{formatDateTime(task.dueAt)}</Fact>
          <Fact label="Customer note">
            {task.description ?? 'The customer did not leave a note.'}
          </Fact>
        </Facts>
      </section>
    </div>
  );
}
