import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Lifecycle } from '@/components/ui/Lifecycle';
import { LifecycleStep } from '@/components/ui/LifecycleStep';

describe('Lifecycle', () => {
  it('renders its steps as an ordered list', () => {
    render(
      <Lifecycle aria-label="Case progress">
        <LifecycleStep state="done">Submitted</LifecycleStep>
        <LifecycleStep state="current">Validated</LifecycleStep>
      </Lifecycle>,
    );

    expect(screen.getByRole('list', { name: 'Case progress' }).tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('LifecycleStep', () => {
  it('renders its children', () => {
    render(
      <Lifecycle>
        <LifecycleStep state="current">Validated</LifecycleStep>
      </Lifecycle>,
    );

    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('announces the progress of the step to assistive technology', () => {
    render(
      <Lifecycle>
        <LifecycleStep state="done">Submitted</LifecycleStep>
      </Lifecycle>,
    );

    expect(screen.getByText('Completed.')).toBeInTheDocument();
  });

  it('announces an exception', () => {
    render(
      <Lifecycle>
        <LifecycleStep state="exception">Analyst review</LifecycleStep>
      </Lifecycle>,
    );

    expect(screen.getByText('Exception.')).toBeInTheDocument();
  });
});
