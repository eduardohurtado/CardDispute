import { useEffect } from 'react';
import { AnalystQueueTable } from '@/components/analyst/AnalystQueueTable';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { useAppDispatch } from '@/store';
import { useGetAnalystTasksQuery } from '@/store/api/analystApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import { describeApiError } from '@/utils/apiError';

const PAGE_SIZE = 20;

export default function AnalystQueuePage() {
  const dispatch = useAppDispatch();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAnalystTasksQuery(
    {
      page: 0,
      size: PAGE_SIZE,
    },
  );

  useEffect(() => {
    if (isError) {
      dispatch(showToast(describeApiError(error, 'We could not load the work queue.'), 'error'));
    }
  }, [dispatch, error, isError]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Analyst workspace</h1>
      </header>

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
