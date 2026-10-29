import { describe, expect, it } from 'vitest';
import {
  decisionLabel,
  decisionSourceLabel,
  disputeStatusMeta,
  humanizeEventType,
  reasonCodeLabel,
  timelineEventTitle,
  timelineEventTone,
} from '@/components/disputes/meta';
import { DISPUTE_STATUSES, type TimelineEvent } from '@/types/dispute';

function timelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {

    eventType: 'STATE_CHANGED',
    oldStatus: 'SUBMITTED',
    newStatus: 'IN_REVIEW',
    actorId: 'SYSTEM',

    details: null,
    occurredAt: '2026-10-10T09:00:00Z',
    ...overrides,
  };
}

describe('disputeStatusMeta', () => {
  it('describes every status of the state machine', () => {
    for (const status of DISPUTE_STATUSES) {
      expect(disputeStatusMeta[status].label).toBeTruthy();
      expect(disputeStatusMeta[status].description).toBeTruthy();
    }
  });
});

describe('reasonCodeLabel', () => {
  it('translates the reason code', () => {
    expect(reasonCodeLabel('POSSIBLE_DUPLICATE')).toBe('Possible duplicate charge');
  });
});

describe('decisionLabel', () => {
  it('translates the decision type', () => {
    expect(decisionLabel('DUPLICATE_SUPPORTED')).toBe('Duplicate supported');
    expect(decisionLabel('NOT_SUPPORTED')).toBe('Not supported');
  });
});

describe('decisionSourceLabel', () => {
  it('translates the decision source', () => {
    expect(decisionSourceLabel('AUTOMATED')).toBe('Automated rules');
    expect(decisionSourceLabel('ANALYST')).toBe('Analyst review');
  });
});

describe('humanizeEventType', () => {
  it('turns a constant into a sentence', () => {
    expect(humanizeEventType('REVIEW_ASSIGNED')).toBe('Review assigned');
  });
});

describe('timelineEventTitle', () => {
  it('describes the creation of the case', () => {
    expect(timelineEventTitle(timelineEvent({ eventType: 'CREATED', oldStatus: null }))).toBe(
      'Case created',
    );
  });

  it('describes a status transition', () => {
    expect(timelineEventTitle(timelineEvent())).toBe('Submitted → In review');
  });

  it('describes a transition without a previous status', () => {
    expect(
      timelineEventTitle(timelineEvent({ oldStatus: null, newStatus: 'AWAITING_ANALYST' })),
    ).toBe('Moved to Awaiting analyst');
  });

  it('falls back to a readable label for an unknown event type', () => {
    expect(timelineEventTitle(timelineEvent({ eventType: 'SOMETHING_NEW' }))).toBe('Something new');
  });
});

describe('timelineEventTone', () => {
  it('marks a timeout as an exception', () => {
    expect(timelineEventTone(timelineEvent({ eventType: 'TIMEOUT' }))).toBe('danger');
  });

  it('marks a review handover', () => {
    expect(timelineEventTone(timelineEvent({ eventType: 'REVIEW_ASSIGNED' }))).toBe('warning');
  });

  it('follows the status the case moved to', () => {
    expect(
      timelineEventTone(timelineEvent({ newStatus: 'RESOLVED_DUPLICATE_SUPPORTED' })),
    ).toBe('success');
  });
});
