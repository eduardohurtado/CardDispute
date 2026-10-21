import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { DisputeDecisionSummary } from '@/components/disputes/DisputeDecisionSummary';
import { DisputeFacts } from '@/components/disputes/DisputeFacts';
import { DisputeLifecycle } from '@/components/disputes/DisputeLifecycle';
import { DisputeTimeline } from '@/components/disputes/DisputeTimeline';
import { disputeStatusMeta } from '@/components/disputes/meta';
import { StatusBadge } from '@/components/disputes/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { paths } from '@/routes/paths';
import { useAppDispatch } from '@/store';
import { useGetDisputeQuery, useGetDisputeTimelineQuery } from '@/store/api/disputesApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import { describeApiError, isNotFound } from '@/utils/apiError';

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const disputeId = id ?? '';
  const dispatch = useAppDispatch();

  const {
    data: dispute,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDisputeQuery(disputeId, { skip: !id });
  const { data: events, isLoading: isTimelineLoading } = useGetDisputeTimelineQuery(disputeId, {
    skip: !id,
  });

  useEffect(() => {
    if (isError && !isNotFound(error)) {
      dispatch(showToast(describeApiError(error, 'We could not load this case.'), 'error'));
    }
  }, [dispatch, error, isError]);

  if (!id || (isError && isNotFound(error))) {
    return (
      <section className="space-y-4">
        <BackLink />
        <StateBlock
          tone="danger"
          title="Case not found"
          description="This case does not exist or is not accessible."
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <BackLink />
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Spinner label="Loading case" />
          <span>Loading the case…</span>
        </div>
      </section>
    );
  }

  if (isError || !dispute) {
    return (
      <section className="space-y-4">
        <BackLink />
        <StateBlock
          tone="danger"
          title="We could not load this case"
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
          Case{' '}
          <span className="font-mono text-base break-all align-middle text-gray-700">
            {dispute.disputeId}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={dispute.status} />
          <p className="text-sm text-gray-600">{disputeStatusMeta[dispute.status].description}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="case-progress-heading" className="space-y-3">
          <h2 id="case-progress-heading" className="text-lg font-semibold text-gray-900">
            Progress
          </h2>
          <DisputeLifecycle dispute={dispute} />
        </section>

        <section aria-labelledby="case-decision-heading" className="space-y-3">
          <h2 id="case-decision-heading" className="text-lg font-semibold text-gray-900">
            Decision
          </h2>
          <DisputeDecisionSummary dispute={dispute} />
        </section>
      </div>

      <section aria-labelledby="case-details-heading" className="space-y-3">
        <h2 id="case-details-heading" className="text-lg font-semibold text-gray-900">
          Case details
        </h2>
        <DisputeFacts dispute={dispute} />
      </section>

      <section aria-labelledby="case-history-heading" className="space-y-3">
        <h2 id="case-history-heading" className="text-lg font-semibold text-gray-900">
          History
        </h2>
        {isTimelineLoading ? (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Spinner label="Loading history" />
            <span>Loading the history…</span>
          </div>
        ) : (
          <DisputeTimeline events={events ?? []} />
        )}
      </section>
    </section>
  );
}

function BackLink() {
  return (
    <Link to={paths.disputes} className="inline-block text-sm font-medium text-blue-700 underline">
      Back to My Disputes
    </Link>
  );
}
