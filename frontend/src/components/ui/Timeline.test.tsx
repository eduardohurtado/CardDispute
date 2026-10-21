import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Timeline } from '@/components/ui/Timeline';
import { TimelineItem } from '@/components/ui/TimelineItem';

describe('Timeline', () => {
  it('renders its items as an ordered list', () => {
    render(
      <Timeline aria-label="Case timeline">
        <TimelineItem>First event</TimelineItem>
        <TimelineItem>Second event</TimelineItem>
      </Timeline>,
    );

    expect(screen.getByRole('list', { name: 'Case timeline' }).tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('hides the marker from assistive technology', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem>Event</TimelineItem>
      </Timeline>,
    );

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});

describe('TimelineItem', () => {
  it('renders its children', () => {
    render(
      <Timeline>
        <TimelineItem>Case created</TimelineItem>
      </Timeline>,
    );

    expect(screen.getByText('Case created')).toBeInTheDocument();
  });

  it('colours the marker with the requested tone', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem tone="success">Case created</TimelineItem>
      </Timeline>,
    );

    expect(container.querySelector('[aria-hidden="true"] span')).toHaveClass('bg-green-600');
  });
});
