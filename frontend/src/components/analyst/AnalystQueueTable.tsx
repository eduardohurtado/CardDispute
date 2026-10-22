import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { analystTaskPath } from '@/routes/paths';
import type { AnalystTaskSummary } from '@/types/analyst';
import { formatAmount, formatDate, formatDateTime } from '@/utils/format';
import { matchKindMeta } from './meta';

export interface AnalystQueueTableProps {
  /** Tasks of the selected queue. */
  tasks: AnalystTaskSummary[];
}

/** The work queue: one row per task, with a link to its review page. */
export function AnalystQueueTable({ tasks }: AnalystQueueTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Analyst work queue, closest deadline first</caption>
        <thead className="text-xs text-gray-500 uppercase">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              Case
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Amount
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Merchant
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Match
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Submitted
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Due
            </th>
            <th scope="col" className="py-2 pl-4 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.taskId} className="border-t border-gray-200">
              <th
                scope="row"
                className="py-3 pr-4 font-mono text-xs font-normal break-all text-gray-900"
              >
                {task.disputeId}
              </th>
              <td className="px-4 py-3">{formatAmount(task.amount, task.currency)}</td>
              <td className="px-4 py-3">{task.merchantName}</td>
              <td className="px-4 py-3">
                <Badge tone={matchKindMeta[task.matchKind].tone}>
                  {matchKindMeta[task.matchKind].label}
                </Badge>
              </td>
              <td className="px-4 py-3">{formatDate(task.submittedAt)}</td>
              <td className="px-4 py-3">{formatDateTime(task.dueAt)}</td>
              <td className="py-3 pl-4">
                <Link
                  to={analystTaskPath(task.taskId)}
                  className="font-medium text-blue-700 underline"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
