import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisputeLifecycle } from '@/components/disputes/DisputeLifecycle';
import { demoDisputes } from '@/mocks/fixtures';
import type { Dispute } from '@/types/dispute';

function disputeByStatus(status: Dispute['status']): Dispute {
  const found = demoDisputes.find((dispute) => dispute.status === status);
  if (!found) throw new Error(`No fixture with status ${status}`);
  return found;
}

describe('DisputeLifecycle', () => {
  it('renders the four phases as an ordered list', () => {
    render(<DisputeLifecycle dispute={disputeByStatus('IN_REVIEW')} />);

    expect(screen.getByRole('list', { name: 'Case progress' }).tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('names every phase', () => {
    render(<DisputeLifecycle dispute={disputeByStatus('AWAITING_ANALYST')} />);

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
    expect(screen.getByText('Analyst review')).toBeInTheDocument();
    expect(screen.getByText('Decision')).toBeInTheDocument();
  });

  it('reports the analyst review as not required for an automated decision', () => {
    render(<DisputeLifecycle dispute={disputeByStatus('RESOLVED_DUPLICATE_SUPPORTED')} />);

    expect(screen.getByText('Not required.')).toBeInTheDocument();
  });

  it('reports a timed out review as an exception', () => {
    render(<DisputeLifecycle dispute={disputeByStatus('TIMEOUT_REVIEW_REQUIRED')} />);

    expect(screen.getByText('Exception.')).toBeInTheDocument();
  });
});
