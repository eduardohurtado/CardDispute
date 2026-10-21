import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisputeFacts } from '@/components/disputes/DisputeFacts';
import { demoDisputes } from '@/mocks/fixtures';
import type { Dispute } from '@/types/dispute';

function disputeById(disputeId: string): Dispute {
  const found = demoDisputes.find((dispute) => dispute.disputeId === disputeId);
  if (!found) throw new Error(`No fixture with id ${disputeId}`);
  return found;
}

const withCandidate = disputeById('b2000000-0000-4000-8000-000000000001');
const withoutCandidate = disputeById('b2000000-0000-4000-8000-000000000002');

describe('DisputeFacts', () => {
  it('shows the case reference', () => {
    render(<DisputeFacts dispute={withCandidate} />);

    expect(screen.getByText(withCandidate.disputeId)).toBeInTheDocument();
  });

  it('shows the status of the case', () => {
    render(<DisputeFacts dispute={withCandidate} />);

    expect(screen.getByText('Duplicate supported')).toBeInTheDocument();
  });

  it('shows the disputed transaction', () => {
    render(<DisputeFacts dispute={withCandidate} />);

    // Both the transaction and the suspected duplicate are for the same merchant.
    expect(screen.getAllByText('Coffee Shop')).toHaveLength(2);
    expect(screen.getAllByText('COP 35,000')).toHaveLength(2);
  });

  it('shows the suspected duplicate when there is one', () => {
    render(<DisputeFacts dispute={withCandidate} />);

    expect(screen.getByRole('heading', { name: 'Suspected duplicate' })).toBeInTheDocument();
  });

  it('hides the suspected duplicate section when there is none', () => {
    render(<DisputeFacts dispute={withoutCandidate} />);

    expect(
      screen.queryByRole('heading', { name: 'Suspected duplicate' }),
    ).not.toBeInTheDocument();
  });

  it('reports a case that is not resolved yet', () => {
    render(<DisputeFacts dispute={withoutCandidate} />);

    expect(screen.getByText('Not resolved yet')).toBeInTheDocument();
  });
});
