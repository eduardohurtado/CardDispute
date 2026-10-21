import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('announces itself as a status with a label', () => {
    render(<Spinner />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<Spinner label="Loading cases" />);

    expect(screen.getByRole('status', { name: 'Loading cases' })).toBeInTheDocument();
  });
});
