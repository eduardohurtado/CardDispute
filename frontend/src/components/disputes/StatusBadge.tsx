import { Badge } from '@/components/ui/Badge';
import type { DisputeStatus } from '@/types/dispute';
import { disputeStatusMeta } from './meta';

/** Badge showing the current status of a dispute. */
export function StatusBadge({ status }: { status: DisputeStatus }) {
  const meta = disputeStatusMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
