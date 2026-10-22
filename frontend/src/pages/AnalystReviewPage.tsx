import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { AnalystDecisionPanel } from '@/components/analyst/AnalystDecisionPanel';
import { AnalystEvidence } from '@/components/analyst/AnalystEvidence';
import { matchKindMeta } from '@/components/analyst/meta';
import { DisputeTimeline } from '@/components/disputes/DisputeTimeline';
import { StatusBadge } from '@/components/disputes/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { paths } from '@/routes/paths';
import { useAppDispatch } from '@/store';
import { useGetAnalystTaskQuery } from '@/store/api/analystApi';
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
          <StatusBadge status={task.status} />
          <Badge tone={matchKindMeta[task.matchKind].tone}>
            {matchKindMeta[task.matchKind].label}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="task-evidence-heading" className="space-y-3">
          <h2 id="task-evidence-heading" className="text-lg font-semibold text-gray-900">
            Evidence
          </h2>
          <AnalystEvidence task={task} />
        </section>

        <section aria-labelledby="task-decision-heading" className="space-y-3">
          <h2 id="task-decision-heading" className="text-lg font-semibold text-gray-900">
            Decision
          </h2>
          <AnalystDecisionPanel task={task} />
        </section>
      </div>

      <section aria-labelledby="task-history-heading" className="space-y-3">
        <h2 id="task-history-heading" className="text-lg font-semibold text-gray-900">
          History
        </h2>
        <DisputeTimeline events={task.timeline} />
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
