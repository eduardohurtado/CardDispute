import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export interface FactProps extends ComponentProps<'div'> {
  /** Name of the value, rendered as the description term. */
  label: string;
  children: ReactNode;
}

/** One label/value pair inside a `Facts` list. */
export function Fact({ label, className, children, ...rest }: FactProps) {
  return (
    <div className={clsx('min-w-0', className)} {...rest}>
      <dt className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400 uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}
