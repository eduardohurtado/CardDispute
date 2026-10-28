import { Timeline } from '@/components/ui/Timeline';
import { TimelineItem } from '@/components/ui/TimelineItem';
import { StateBlock } from '@/components/ui/StateBlock';
import type { TimelineEvent } from '@/types/dispute';
import { formatDateTime } from '@/utils/format';
import { timelineEventTitle, timelineEventTone } from './meta';

/** Read-only history of the case, oldest event last. */
export function DisputeTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <StateBlock
        title="No history yet"
        description="The events of this case will appear here as it progresses."
      />
    );
  }

  return (
    <Timeline aria-label="Case timeline">
      {events.map((event) => (
        <TimelineItem key={`${event.eventType}-${event.newStatus}-${event.actorId}`} tone={timelineEventTone(event)}>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{timelineEventTitle(event)}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
            <span aria-hidden="true"> · </span>
            <span>{event.actorId}</span>
          </p>
          {event.details ? <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{event.details}</p> : null}
        </TimelineItem>
      ))}
    </Timeline>
  );
}
