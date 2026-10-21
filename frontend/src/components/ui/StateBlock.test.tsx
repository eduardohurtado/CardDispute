import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StateBlock } from '@/components/ui/StateBlock';

describe('StateBlock', () => {
  it('renders the title and the description', () => {
    render(<StateBlock title="No cases yet" description="Submit a dispute to see it here." />);

    expect(screen.getByText('No cases yet')).toBeInTheDocument();
    expect(screen.getByText('Submit a dispute to see it here.')).toBeInTheDocument();
  });

  it('announces itself as a status by default', () => {
    render(<StateBlock title="No cases yet" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('can be announced as an alert', () => {
    render(<StateBlock title="Something went wrong" role="alert" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('renders the danger tone', () => {
    const { container } = render(<StateBlock title="Failed" tone="danger" />);

    expect(container.firstChild).toHaveClass('bg-red-50');
  });
});
