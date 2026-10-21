import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { toneBadgeClasses, type Tone } from './tone';

export interface BadgeProps extends ComponentProps<'span'> {
  /** Semantic colour of the badge. */
  tone?: Tone;
  children: ReactNode;
}

/** Small status pill. Use it for a state, never for an action. */
export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneBadgeClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
