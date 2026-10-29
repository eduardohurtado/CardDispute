import type { Tone } from '@/components/ui/tone';
import type { DisputeAssessmentOutcome } from '@/types/dispute';
import type { AnalystQueue, MatchKind } from '@/types/analyst';

/** Presentation metadata for a work queue. */
export interface AnalystQueueMeta {
  /** Short label of the tab. */
  label: string;
  /** Sentence explaining what the queue holds. */
  description: string;
}

export const analystQueueMeta: Record<AnalystQueue, AnalystQueueMeta> = {
  PENDING: {
    label: 'Pending tasks',
    description: 'Cases whose deadline is still more than a day away.',
  },
  DUE_SOON: {
    label: 'Due soon',
    description: 'Cases that are due within a day or already overdue.',
  },
};

export interface MatchKindMeta {
  /** Short label of the match. */
  label: string;
  /** Colour of the badge. */
  tone: Tone;
}

/**
 * How the two transactions matched.
 *
 * The values mirror the merchant comparison of the backend rules
 * (`MerchantMatch`), with `UNKNOWN` for a case whose assessment did not
 * report a match.
 */
export const matchKindMeta: Record<MatchKind, MatchKindMeta> = {
  EXACT: { label: 'Exact match', tone: 'success' },
  AMBIGUOUS: { label: 'Ambiguous match', tone: 'warning' },
  NONE: { label: 'No match', tone: 'neutral' },
  UNKNOWN: { label: 'Unknown match', tone: 'neutral' },
};

export interface AssessmentOutcomeMeta {
  /** Short label of the outcome. */
  label: string;
  /** Colour of the badge. */
  tone: Tone;
}

/** Outcome of the automated rules, as shown to the analyst. */
export const assessmentOutcomeMeta: Record<DisputeAssessmentOutcome, AssessmentOutcomeMeta> = {
  SUPPORTED: { label: 'Duplicate supported by rules', tone: 'success' },
  NOT_SUPPORTED: { label: 'Not supported by rules', tone: 'neutral' },
  MANUAL_REVIEW: { label: 'Needs manual review', tone: 'warning' },
};
