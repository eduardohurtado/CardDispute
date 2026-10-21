import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisputeDecisionSummary } from '@/components/disputes/DisputeDecisionSummary';
import { demoDisputes } from '@/mocks/fixtures';
import type { Dispute } from '@/types/dispute';

function disputeByStatus(status: Dispute['status']): Dispute {
  const found = demoDisputes.find((dispute) => dispute.status === status);
  if (!found) throw new Error(`No fixture with status ${status}`);
  return found;
}

describe('DisputeDecisionSummary', () => {
  it('shows a placeholder while the decision is pending', () => {
    render(<DisputeDecisionSummary dispute={disputeByStatus('AWAITING_ANALYST')} />);

    expect(screen.getByText('Decision pending')).toBeInTheDocument();
    expect(screen.queryByRole('term', { name: 'Outcome' })).not.toBeInTheDocument();
  });

  it('shows the outcome of a decided case', () => {
    render(<DisputeDecisionSummary dispute={disputeByStatus('RESOLVED_DUPLICATE_SUPPORTED')} />);

    expect(screen.getByText('Duplicate supported')).toBeInTheDocument();
    expect(screen.getByText('Automated rules')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
  });

  it('shows the rationale of the decision', () => {
    render(<DisputeDecisionSummary dispute={disputeByStatus('RESOLVED_DUPLICATE_SUPPORTED')} />);

    expect(
      screen.getByText('Same merchant, same amount and same currency within one hour.'),
    ).toBeInTheDocument();
  });
});
