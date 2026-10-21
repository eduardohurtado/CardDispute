import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

/** How far a case has travelled through its lifecycle. */
export type LifecycleStepState = 'done' | 'current' | 'pending' | 'skipped' | 'exception';

const stateMarkerClasses: Record<LifecycleStepState, string> = {
  done: 'border-green-600 bg-green-600 text-white',
  current: 'border-blue-600 bg-blue-600 text-white',
  pending: 'border-gray-300 bg-white text-transparent',
  skipped: 'border-gray-300 bg-gray-100 text-gray-400',
  exception: 'border-red-600 bg-red-600 text-white',
};

const stateGlyphs: Record<LifecycleStepState, string> = {
  done: '✓',
  current: '•',
  pending: '•',
  skipped: '–',
  exception: '!',
};

const stateLabels: Record<LifecycleStepState, string> = {
  done: 'Completed',
  current: 'Current step',
  pending: 'Not reached yet',
  skipped: 'Not required',
  exception: 'Exception',
};

export interface LifecycleStepProps extends ComponentProps<'li'> {
  /** Progress of this step relative to the case. */
  state: LifecycleStepState;
}

/** One phase of a `Lifecycle`. The children hold the step content. */
export function LifecycleStep({ state, className, children, ...rest }: LifecycleStepProps) {
  return (
    <li className={clsx('flex gap-3', className)} {...rest}>
      <span
        aria-hidden="true"
        className={clsx(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
          stateMarkerClasses[state],
        )}
      >
        {stateGlyphs[state]}
      </span>
      <div className="min-w-0 flex-1">
        <span className="sr-only">{stateLabels[state]}. </span>
        {children}
      </div>
    </li>
  );
}
