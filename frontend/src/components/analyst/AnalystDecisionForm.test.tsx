import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalystDecisionForm } from '@/components/analyst/AnalystDecisionForm';

describe('AnalystDecisionForm', () => {
  it('refuses to submit without a decision', async () => {
    const onSubmit = vi.fn();
    render(<AnalystDecisionForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick the decision before submitting.');
  });

  it('refuses to submit without a rationale', async () => {
    const onSubmit = vi.fn();
    render(<AnalystDecisionForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('radio', { name: /Support duplicate/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('A rationale is required.');
  });

  it('submits the decision and the rationale', async () => {
    const onSubmit = vi.fn();
    render(<AnalystDecisionForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('radio', { name: /Support duplicate/ }));
    await userEvent.type(screen.getByLabelText('Rationale'), 'Same amount and card within 30 minutes.');
    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).toHaveBeenCalledWith({
      decision: 'DUPLICATE_SUPPORTED',
      rationale: 'Same amount and card within 30 minutes.',
    });
  });

  it('trims the rationale before submitting it', async () => {
    const onSubmit = vi.fn();
    render(<AnalystDecisionForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('radio', { name: /Not supported/ }));
    await userEvent.type(screen.getByLabelText('Rationale'), '  Only one purchase exists.  ');
    await userEvent.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(onSubmit).toHaveBeenCalledWith({
      decision: 'NOT_SUPPORTED',
      rationale: 'Only one purchase exists.',
    });
  });

  it('shows the error of the server', () => {
    render(<AnalystDecisionForm onSubmit={vi.fn()} submitError="The task was already completed." />);

    expect(screen.getByRole('alert')).toHaveTextContent('The task was already completed.');
  });
});
