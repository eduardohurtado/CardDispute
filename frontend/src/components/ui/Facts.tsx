import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

/** Grid of label/value pairs. Use it with `Fact` children. */
export function Facts({ className, ...rest }: ComponentProps<'dl'>) {
  return (
    <dl className={clsx('grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2', className)} {...rest} />
  );
}
