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
import { useAppDispatch, useAppSelector } from '@/store';
import {
  disputesApi,
  useGetDisputeQuery,
  useGetDisputeTimelineQuery,
} from '@/store/api/disputesApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import type { DisputeStatus } from '@/types/dispute';
import { describeApiError, isNotFound } from '@/utils/apiError';

/** While a case is in one of these statuses it can still move on its own, so the page refreshes. */
const LIVE_STATUSES: readonly DisputeStatus[] = ['SUBMITTED', 'IN_REVIEW', 'AWAITING_ANALYST'];
const REFRESH_INTERVAL_MS = 5000;

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const disputeId = id ?? '';
  const dispatch = useAppDispatch();

  // Poll only while the last known status can still change (FE-1, Increment 2).
  const cachedStatus = useAppSelector(
    (state) => disputesApi.endpoints.getDispute.select(disputeId)(state).data?.status,
  );
  const pollingInterval =
    cachedStatus && LIVE_STATUSES.includes(cachedStatus) ? REFRESH_INTERVAL_MS : 0;
  const polling = { pollingInterval, skipPollingIfUnfocused: true };

  const {
    data: dispute,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDisputeQuery(disputeId, { skip: !id, ...polling });
  const { data: events, isLoading: isTimelineLoading } = useGetDisputeTimelineQuery(disputeId, {
    skip: !id,
    ...polling,
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
