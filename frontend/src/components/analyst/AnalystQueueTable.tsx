import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { analystTaskPath } from '@/routes/paths';
import type { AnalystTask } from '@/types/analyst';
import { formatDateTime } from '@/utils/format';

export interface AnalystQueueTableProps {
  tasks: AnalystTask[];
}

/** The work queue: one row per task, with a link to its review page. */
export function AnalystQueueTable({ tasks }: AnalystQueueTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Analyst work queue</caption>
        <thead className="text-xs text-gray-500 uppercase">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              Case
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Task
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Assignee
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Created
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Overdue
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
              <td className="px-4 py-3">{task.taskName}</td>
              <td className="px-4 py-3">{task.assignee ?? '-'}</td>
              <td className="px-4 py-3">{task.createdAt ? formatDateTime(task.createdAt) : '-'}</td>
              <td className="px-4 py-3">
                {task.overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="neutral">No</Badge>}
              </td>
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
