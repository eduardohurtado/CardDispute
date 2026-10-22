import { Fact } from '@/components/ui/Fact';
import { Facts } from '@/components/ui/Facts';
import type { Dispute, DisputeTransaction } from '@/types/dispute';
import { formatAmount, formatDateTime } from '@/utils/format';
import { reasonCodeLabel } from './meta';
import { StatusBadge } from './StatusBadge';

/** Case metadata, the disputed transaction and the suspected duplicate. */
export function DisputeFacts({ dispute }: { dispute: Dispute }) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="case-facts-heading">
        <h2 id="case-facts-heading" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Case
        </h2>
        <Facts className="mt-3">
          <Fact label="Case reference">
            <span className="font-mono text-xs break-all">{dispute.disputeId}</span>
          </Fact>
          <Fact label="Status">
            <StatusBadge status={dispute.status} />
          </Fact>
          <Fact label="Reason">{reasonCodeLabel(dispute.reasonCode)}</Fact>
          <Fact label="Submitted">{formatDateTime(dispute.createdAt)}</Fact>
          <Fact label="Last update">{formatDateTime(dispute.updatedAt)}</Fact>
          <Fact label="Resolved">
            {dispute.resolvedAt ? formatDateTime(dispute.resolvedAt) : 'Not resolved yet'}
          </Fact>
        </Facts>
      </section>

      <section aria-labelledby="transaction-facts-heading">
        <h2 id="transaction-facts-heading" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Transaction
        </h2>
        <Facts className="mt-3">
          <TransactionFacts transaction={dispute.transaction} />
        </Facts>
      </section>

      {dispute.candidateTransaction ? (
        <section aria-labelledby="candidate-facts-heading">
          <h2 id="candidate-facts-heading" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Suspected duplicate
          </h2>
          <Facts className="mt-3">
            <TransactionFacts transaction={dispute.candidateTransaction} />
          </Facts>
        </section>
      ) : null}
    </div>
  );
}

function TransactionFacts({ transaction }: { transaction: DisputeTransaction }) {
  return (
    <>
      <Fact label="Merchant">{transaction.merchantName}</Fact>
      <Fact label="Amount">{formatAmount(transaction.amount, transaction.currency)}</Fact>
      <Fact label="Card">•••• {transaction.cardLast4}</Fact>
      <Fact label="Status">{transaction.status}</Fact>
      <Fact label="Posted">
        {transaction.postedAt ? formatDateTime(transaction.postedAt) : 'Not posted yet'}
      </Fact>
      <Fact label="Occurred">{formatDateTime(transaction.occurredAt)}</Fact>
    </>
  );
}
