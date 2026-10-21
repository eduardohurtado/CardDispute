import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/disputes/StatusBadge';

describe('StatusBadge', () => {
  it('shows the label of the status', () => {
    render(<StatusBadge status="AWAITING_ANALYST" />);

    expect(screen.getByText('Awaiting analyst')).toBeInTheDocument();
  });

  it('uses the colour of the status', () => {
    render(<StatusBadge status="RESOLVED_DUPLICATE_SUPPORTED" />);

    expect(screen.getByText('Duplicate supported')).toHaveClass('bg-green-50');
  });

  it('marks a timed out review as an error', () => {
    render(<StatusBadge status="TIMEOUT_REVIEW_REQUIRED" />);

    expect(screen.getByText('Review timed out')).toHaveClass('bg-red-50');
  });
});
