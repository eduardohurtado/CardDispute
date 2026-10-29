import { Fact } from '@/components/ui/Fact';
import type { DisputeTransaction } from '@/types/dispute';
import { formatAmount, formatDateTime } from '@/utils/format';

/** Label/value pairs describing one synthetic transaction. */
export function TransactionFacts({ transaction }: { transaction: DisputeTransaction }) {
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
