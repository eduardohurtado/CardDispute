import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Awaiting analyst</Badge>);
    expect(screen.getByText('Awaiting analyst')).toBeInTheDocument();
  });

  it('uses the neutral tone by default', () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText('Draft')).toHaveClass('bg-gray-100');
  });

  it('uses the requested tone', () => {
    render(<Badge tone="danger">Review timeout</Badge>);
    expect(screen.getByText('Review timeout')).toHaveClass('bg-red-50');
  });

  it('keeps additional class names', () => {
    render(<Badge className="uppercase">Submitted</Badge>);
    expect(screen.getByText('Submitted')).toHaveClass('uppercase');
  });
});
