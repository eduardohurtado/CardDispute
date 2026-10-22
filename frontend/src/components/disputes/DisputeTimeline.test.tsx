import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisputeTimeline } from '@/components/disputes/DisputeTimeline';
import { demoTimeline } from '@/mocks/fixtures';

const events = demoTimeline['b2000000-0000-4000-8000-000000000001'];

describe('DisputeTimeline', () => {
  it('renders the events as an ordered list', () => {
    render(<DisputeTimeline events={events} />);

    expect(screen.getByRole('list', { name: 'Case timeline' }).tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(events.length);
  });

  it('describes every event', () => {
    render(<DisputeTimeline events={events} />);

    expect(screen.getByText('Case created')).toBeInTheDocument();
    expect(screen.getByText('Submitted → In review')).toBeInTheDocument();
    expect(screen.getByText('Decision recorded')).toBeInTheDocument();
  });

  it('shows when an event happened', () => {
    render(<DisputeTimeline events={demoTimeline['b2000000-0000-4000-8000-000000000002']} />);

    expect(
      screen.getByText('11 Oct 2026, 14:31', {
        selector: 'time[datetime="2026-10-11T14:31:05Z"]',
      }),
    ).toBeInTheDocument();
  });

  it('shows the explanation of an event', () => {
    render(<DisputeTimeline events={events} />);

    expect(
      screen.getByText('Same merchant, amount and currency within one hour.'),
    ).toBeInTheDocument();
  });

  it('renders a placeholder when there is no history', () => {
    render(<DisputeTimeline events={[]} />);

    expect(screen.getByText('No history yet')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
