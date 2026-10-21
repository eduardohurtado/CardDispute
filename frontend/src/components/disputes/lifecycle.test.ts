import { describe, expect, it } from 'vitest';
import { buildLifecycle } from '@/components/disputes/lifecycle';
import { demoDisputes } from '@/mocks/fixtures';
import type { Dispute } from '@/types/dispute';

function disputeByStatus(status: Dispute['status']): Dispute {
  const found = demoDisputes.find((dispute) => dispute.status === status);
  if (!found) throw new Error(`No fixture with status ${status}`);
  return found;
}

function stateOf(dispute: Dispute, phase: string) {
  const step = buildLifecycle(dispute).find((candidate) => candidate.phase === phase);
  if (!step) throw new Error(`No step for phase ${phase}`);
  return step.state;
}

describe('buildLifecycle', () => {
  it('always reports the four lifecycle phases', () => {
    expect(buildLifecycle(disputeByStatus('IN_REVIEW'))).toHaveLength(4);
  });

  it('marks the phases before the current one as done', () => {
    const dispute = disputeByStatus('AWAITING_ANALYST');

    expect(stateOf(dispute, 'submitted')).toBe('done');
    expect(stateOf(dispute, 'validated')).toBe('done');
    expect(stateOf(dispute, 'analystReview')).toBe('current');
    expect(stateOf(dispute, 'decided')).toBe('pending');
  });

  it('skips the analyst review when the rules decided the case', () => {
    expect(stateOf(disputeByStatus('RESOLVED_DUPLICATE_SUPPORTED'), 'analystReview')).toBe('skipped');
  });

  it('completes the analyst review when an analyst decided the case', () => {
    expect(stateOf(disputeByStatus('RESOLVED_NOT_SUPPORTED'), 'analystReview')).toBe('done');
  });

  it('flags a timed out review as an exception', () => {
    expect(stateOf(disputeByStatus('TIMEOUT_REVIEW_REQUIRED'), 'analystReview')).toBe('exception');
  });

  it('labels the last step as rejected when the case was ineligible', () => {
    const rejected: Dispute = {
      ...disputeByStatus('IN_REVIEW'),
      status: 'REJECTED_INELIGIBLE',
      decision: null,
    };

    const step = buildLifecycle(rejected).find((candidate) => candidate.phase === 'decided');

    expect(step?.label).toBe('Rejected');
    expect(step?.state).toBe('current');
  });
});
