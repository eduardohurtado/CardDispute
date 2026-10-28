import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { AnalystDecisionPanel } from '@/components/analyst/AnalystDecisionPanel';
import { DisputeFacts } from '@/components/disputes/DisputeFacts';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { isMockApi } from '@/config/apiMode';
import { paths } from '@/routes/paths';
import { useAppDispatch } from '@/store';
import { useGetAnalystTaskQuery } from '@/store/api/analystApi';
import { useGetDisputeQuery } from '@/store/api/disputesApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import { describeApiError } from '@/utils/apiError';

export default function AnalystReviewPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const dispatch = useAppDispatch();

  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAnalystTaskQuery(taskId ?? '', { skip: !taskId });

  const {
    data: dispute,
    isLoading: isDisputeLoading,
    isError: isDisputeError,
  } = useGetDisputeQuery(task?.disputeId ?? '', { skip: !task?.disputeId });

  useEffect(() => {
    if (isError) {
      dispatch(showToast(describeApiError(error, 'We could not load this task.'), 'error'));
    }
  }, [dispatch, error, isError]);

  if (!taskId) {
    return (
      <section className="space-y-4">
        <BackLink />
        <StateBlock tone="danger" title="Task not found" description="No task was requested." />
      </section>
    );
  }

  if (!isMockApi) {
    // allow if backend exposed
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <BackLink />
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Spinner label="Loading task" />
          <span>Loading the task…</span>
        </div>
      </section>
    );
  }

  if (isError || !task) {
    return (
      <section className="space-y-4">
        <BackLink />
        <StateBlock
          tone="danger"
          title="We could not load this task"
          description={describeApiError(error, 'The service is not available right now.')}
        >
          <button
            type="button"
            className="mt-4 cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </StateBlock>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <BackLink />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          Review case{' '}
          <span className="font-mono text-base break-all align-middle text-gray-700">
            {task.disputeId}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={task.overdue ? 'danger' : 'neutral'}>
            {task.overdue ? 'Overdue' : 'On time'}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="task-evidence-heading" className="space-y-3">
          <h2 id="task-evidence-heading" className="text-lg font-semibold text-gray-900">
            Task
          </h2>
          <div className="rounded-md border border-gray-200 p-4 text-sm">
            <div><span className="font-medium">Task ID:</span> {task.taskId}</div>
            <div><span className="font-medium">Task name:</span> {task.taskName}</div>
            <div><span className="font-medium">Assignee:</span> {task.assignee ?? '-'}</div>
            <div><span className="font-medium">Created:</span> {task.createdAt}</div>
          </div>
        </section>

        <section aria-labelledby="task-decision-heading" className="space-y-3">
          <h2 id="task-decision-heading" className="text-lg font-semibold text-gray-900">
            Decision
          </h2>
          <AnalystDecisionPanel task={task} />
        </section>
      </div>

      <section aria-labelledby="dispute-details-heading" className="space-y-3">
        <h2 id="dispute-details-heading" className="text-lg font-semibold text-gray-900">
          Dispute details
        </h2>
        {isDisputeLoading ? (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Spinner label="Loading dispute" />
            <span>Loading dispute details…</span>
          </div>
        ) : dispute && !isDisputeError ? (
          <DisputeFacts dispute={dispute} />
        ) : task.transaction ? (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
            Dispute details are not available.
          </div>
        ) : (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
            Dispute details are not available for this task.
          </div>
        )}
      </section>
    </section>
  );
}

function BackLink() {
  return (
    <Link to={paths.analyst} className="inline-block text-sm font-medium text-blue-700 underline">
      Back to the work queue
    </Link>
  );
}
