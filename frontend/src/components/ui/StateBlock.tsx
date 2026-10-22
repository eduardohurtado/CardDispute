import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export interface StateBlockProps extends ComponentProps<'div'> {
  /** Short headline, for example "No cases yet". */
  title: string;
  /** Optional explanation shown under the title. */
  description?: string;
  /** `danger` for failures, `neutral` for empty and informational states. */
  tone?: 'neutral' | 'danger';
  children?: ReactNode;
}

/**
 * Placeholder for loading, empty and error states.
 *
 * It renders `role="status"` by default; pass `role="alert"` to announce an
 * error assertively.
 */
export function StateBlock({
  title,
  description,
  tone = 'neutral',
  className,
  children,
  ...rest
}: StateBlockProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={clsx(
        'rounded-md border p-6 text-center',
        tone === 'danger' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
        className,
      )}
      {...rest}
    >
      <p className={clsx('text-sm font-medium', tone === 'danger' ? 'text-red-800 dark:text-red-300' : 'text-gray-900 dark:text-gray-100')}>
        {title}
      </p>
      {description ? (
        <p className={clsx('mt-1 text-sm', tone === 'danger' ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-400')}>
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
