import { useEffect, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { disputeStatusMeta } from '@/components/disputes/meta';
import { StatusBadge } from '@/components/disputes/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { disputePath } from '@/routes/paths';
import { useAppDispatch } from '@/store';
import { useGetDisputesQuery } from '@/store/api/disputesApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import { DISPUTE_STATUSES, type DisputeStatus } from '@/types/dispute';
import { describeApiError } from '@/utils/apiError';
import { formatAmount, formatDate } from '@/utils/format';

const PAGE_SIZE = 20;

function parseStatus(value: string | null): DisputeStatus | undefined {
  return DISPUTE_STATUSES.find((status) => status === value);
}

export default function MyDisputesPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get('status'));

  const { data, isLoading, isFetching, isError, error, refetch } = useGetDisputesQuery({
    status,
    page: 0,
    size: PAGE_SIZE,
  });

  useEffect(() => {
    if (isError) {
      dispatch(showToast(describeApiError(error, 'We could not load your cases.'), 'error'));
    }
  }, [dispatch, error, isError]);

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams);
    const value = event.target.value;

    if (value) {
      next.set('status', value);
    } else {
      next.delete('status');
    }
    setSearchParams(next);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My Disputes</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            id="status-filter"
            value={status ?? ''}
            onChange={handleStatusChange}
            className="cursor-pointer rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
          >
            <option value="">All statuses</option>
            {DISPUTE_STATUSES.map((option) => (
              <option key={option} value={option}>
                {disputeStatusMeta[option].label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <Spinner label="Loading cases" />
          <span>Loading your cases…</span>
        </div>
      ) : isError ? (
        <StateBlock
          tone="danger"
          title="We could not load your cases"
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
      ) : data?.items.length === 0 ? (
        <StateBlock
          title="No cases to show"
          description={
            status
              ? 'No case of yours has this status yet.'
              : 'You have not reported a possible duplicate charge yet.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your dispute cases, newest first</caption>
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Case
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Merchant
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Submitted
                </th>
                <th scope="col" className="py-2 pl-4 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((dispute) => (
                <tr key={dispute.disputeId} className="border-t border-gray-200 dark:border-gray-700">
                  <th
                    scope="row"
                    className="py-3 pr-4 font-mono text-xs font-normal break-all text-gray-900 dark:text-gray-100"
                  >
                    {dispute.disputeId}
                  </th>
                  <td className="px-4 py-3">{dispute.transaction.merchantName}</td>
                  <td className="px-4 py-3">
                    {formatAmount(dispute.transaction.amount, dispute.transaction.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={dispute.status} />
                  </td>
                  <td className="px-4 py-3">{formatDate(dispute.createdAt)}</td>
                  <td className="py-3 pl-4">
                    <Link
                      to={disputePath(dispute.disputeId)}
                      className="font-medium text-blue-700 dark:text-blue-300 underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isFetching ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Updating…</p> : null}
        </div>
      )}
    </section>
  );
}
