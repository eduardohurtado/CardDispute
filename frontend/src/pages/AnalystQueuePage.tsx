import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { AnalystQueueTable } from '@/components/analyst/AnalystQueueTable';
import { AnalystQueueTabs } from '@/components/analyst/AnalystQueueTabs';
import { analystQueueMeta } from '@/components/analyst/meta';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { isMockApi } from '@/config/apiMode';
import { useAppDispatch } from '@/store';
import { useGetAnalystTasksQuery } from '@/store/api/analystApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import { ANALYST_QUEUES, type AnalystQueue } from '@/types/analyst';
import { describeApiError } from '@/utils/apiError';

const PAGE_SIZE = 20;

const EMPTY_COUNTS: Record<AnalystQueue, number> = { PENDING: 0, DUE_SOON: 0 };

function parseQueue(value: string | null): AnalystQueue {
  return ANALYST_QUEUES.find((queue) => queue === value) ?? 'PENDING';
}

export default function AnalystQueuePage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const queue = parseQueue(searchParams.get('queue'));

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAnalystTasksQuery(
    {
      queue,
      page: 0,
      size: PAGE_SIZE,
    },
  );

  useEffect(() => {
    if (isError) {
      dispatch(showToast(describeApiError(error, 'We could not load the work queue.'), 'error'));
    }
  }, [dispatch, error, isError]);

  function handleQueueSelect(next: AnalystQueue) {
    setSearchParams(next === 'PENDING' ? {} : { queue: next });
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Analyst workspace</h1>
        <p className="text-sm text-gray-600">{analystQueueMeta[queue].description}</p>
      </header>

      <AnalystQueueTabs
        activeQueue={queue}
        counts={data?.queueCounts ?? EMPTY_COUNTS}
        onSelect={handleQueueSelect}
      />

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Spinner label="Loading work queue" />
          <span>Loading the work queue…</span>
        </div>
      ) : isError ? (
        <StateBlock
          tone="danger"
          title="We could not load the work queue"
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
      ) : data?.content.length === 0 ? (
        <StateBlock
          title="No tasks in this queue"
          description="Nothing needs your attention here right now."
        />
      ) : (
        <>
          <AnalystQueueTable tasks={data?.content ?? []} />
          {isFetching ? <p className="mt-2 text-xs text-gray-500">Updating…</p> : null}
        </>
      )}
    </section>
  );
}
