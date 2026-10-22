import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('is a button that does not submit a form by default', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('can submit a form', () => {
    render(<Button type="submit">Submit decision</Button>);

    expect(screen.getByRole('button', { name: 'Submit decision' })).toHaveAttribute('type', 'submit');
  });

  it('calls the click handler', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Review</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire while it is disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Review
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
