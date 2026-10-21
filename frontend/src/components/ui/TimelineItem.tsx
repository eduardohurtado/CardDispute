import { clsx } from 'clsx';
import type { ComponentProps } from 'react';
import { toneDotClasses, type Tone } from './tone';

export interface TimelineItemProps extends ComponentProps<'li'> {
  /** Colour of the marker dot. */
  tone?: Tone;
}

/** One entry of a `Timeline`. The children hold the event content. */
export function TimelineItem({ tone = 'neutral', className, children, ...rest }: TimelineItemProps) {
  return (
    <li className={clsx('group flex gap-3', className)} {...rest}>
      <span aria-hidden="true" className="flex flex-col items-center pt-1.5">
        <span className={clsx('size-2.5 shrink-0 rounded-full border-2', toneDotClasses[tone])} />
        <span className="mt-1 w-px flex-1 bg-gray-200 group-last:hidden" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
