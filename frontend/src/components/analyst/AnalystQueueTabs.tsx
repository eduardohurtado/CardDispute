import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import type { AnalystQueue } from '@/types/analyst';
import { analystQueueMeta } from './meta';

export interface AnalystQueueTabsProps {
  /** The queue that is currently shown. */
  activeQueue: AnalystQueue;
  /** Size of every queue, used for the counters. */
  counts: Record<AnalystQueue, number>;
  /** Called with the queue the analyst picked. */
  onSelect: (queue: AnalystQueue) => void;
}

/** Queue switcher with the size of each queue. */
export function AnalystQueueTabs({ activeQueue, counts, onSelect }: AnalystQueueTabsProps) {
  return (
    <div role="tablist" aria-label="Work queues" className="flex flex-wrap gap-2">
      {(['PENDING', 'DUE_SOON'] as const).map((queue) => {
        const isActive = queue === activeQueue;

        return (
          <button
            key={queue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(queue)}
            className={clsx(
              'inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
              isActive
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
            )}
          >
            {analystQueueMeta[queue].label}
            <Badge tone={isActive ? 'info' : 'neutral'}>{counts[queue]}</Badge>
          </button>
        );
      })}
    </div>
  );
}
