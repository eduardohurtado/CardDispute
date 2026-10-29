import type { Tone } from '@/components/ui/tone';
import type {
  DisputeDecisionSource,
  DisputeDecisionType,
  DisputeReasonCode,
  DisputeStatus,
  TimelineEvent,
} from '@/types/dispute';

/** Presentation metadata for a dispute status. */
export interface DisputeStatusMeta {
  /** Short label shown in the badge. */
  label: string;
  tone: Tone;
  /** Sentence explaining the state to the customer. */
  description: string;
}

/**
 * Every status the state machine can produce, with its label and colour.
 *
 * The record is keyed by the full status union, so adding a status to the
 * backend contract fails the type check until the presentation is added too.
 */
export const disputeStatusMeta: Record<DisputeStatus, DisputeStatusMeta> = {
  SUBMITTED: {
    label: 'Submitted',
    tone: 'info',
    description: 'We received your dispute and will validate it shortly.',
  },
  IN_REVIEW: {
    label: 'In review',
    tone: 'info',
    description: 'We are comparing both transactions against our duplicate rules.',
  },
  AWAITING_ANALYST: {
    label: 'Awaiting analyst',
    tone: 'warning',
    description: 'An analyst reviews the case because the rules could not decide it.',
  },
  RESOLVED_DUPLICATE_SUPPORTED: {
    label: 'Duplicate supported',
    tone: 'success',
    description: 'The charge was confirmed as a duplicate.',
  },
  RESOLVED_NOT_SUPPORTED: {
    label: 'Not supported',
    tone: 'neutral',
    description: 'The charge was confirmed as a legitimate purchase.',
  },
  TIMEOUT_REVIEW_REQUIRED: {
    label: 'Review timed out',
    tone: 'danger',
    description: 'The review did not finish in time. The case is flagged for reassignment.',
  },
  REJECTED_INELIGIBLE: {
    label: 'Rejected (ineligible)',
    tone: 'danger',
    description: 'The case did not meet the eligibility rules and was rejected.',
  },
};

const reasonCodeLabels: Record<DisputeReasonCode, string> = {
  POSSIBLE_DUPLICATE: 'Possible duplicate charge',
};

export function reasonCodeLabel(reasonCode: DisputeReasonCode): string {
  return reasonCodeLabels[reasonCode] ?? reasonCode;
}

const decisionTypeLabels: Record<DisputeDecisionType, string> = {
  DUPLICATE_SUPPORTED: 'Duplicate supported',
  NOT_SUPPORTED: 'Not supported',
};

export function decisionLabel(decisionType: DisputeDecisionType): string {
  return decisionTypeLabels[decisionType] ?? decisionType;
}

const decisionSourceLabels: Record<DisputeDecisionSource, string> = {
  AUTOMATED: 'Automated rules',
  ANALYST: 'Analyst review',
};

export function decisionSourceLabel(source: DisputeDecisionSource): string {
  return decisionSourceLabels[source] ?? source;
}

/** Turns `REVIEW_ASSIGNED` into `Review assigned` for unknown event types. */
export function humanizeEventType(eventType: string): string {
  const words = eventType.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!words) return eventType;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Headline of an audit event, derived from its type and status transition. */
export function timelineEventTitle(event: TimelineEvent): string {
  switch (event.eventType) {
    case 'CREATED':
      return 'Case created';
    case 'STATE_CHANGED':
      return stateChangeTitle(event);
    case 'DECIDED':
      return 'Decision recorded';
    case 'REVIEW_ASSIGNED':
      return 'Sent to analyst review';
    case 'REVIEW_COMPLETED':
      return 'Analyst review completed';
    case 'TIMEOUT':
      return 'Review timed out';
    default:
      return humanizeEventType(event.eventType);
  }
}

function stateChangeTitle(event: TimelineEvent): string {
  if (event.oldStatus && event.newStatus) {
    return `${disputeStatusMeta[event.oldStatus].label} → ${disputeStatusMeta[event.newStatus].label}`;
  }
  if (event.newStatus) {
    return `Moved to ${disputeStatusMeta[event.newStatus].label}`;
  }
  return 'Status changed';
}

/** Colour of the marker for an audit event. */
export function timelineEventTone(event: TimelineEvent): Tone {
  if (event.newStatus === 'RESOLVED_DUPLICATE_SUPPORTED') return 'success';
  if (event.newStatus === 'RESOLVED_NOT_SUPPORTED') return 'success';
  if (event.newStatus === 'REJECTED_INELIGIBLE') return 'danger';
  if (event.newStatus === 'TIMEOUT_REVIEW_REQUIRED') return 'danger';
  if (event.eventType === 'TIMEOUT') return 'danger';
  if (event.eventType === 'REVIEW_ASSIGNED' || event.eventType === 'REVIEW_COMPLETED') return 'warning';
  if (event.eventType === 'CREATED') return 'info';
  if (event.eventType === 'DECIDED' && event.newStatus) {
    return disputeStatusMeta[event.newStatus]?.tone ?? 'neutral';
  }
  if (event.newStatus) return disputeStatusMeta[event.newStatus].tone;
  return 'neutral';
}
