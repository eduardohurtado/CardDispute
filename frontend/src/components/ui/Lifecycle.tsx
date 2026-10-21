import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

/** Ordered list of the phases a case goes through. */
export function Lifecycle({ className, ...rest }: ComponentProps<'ol'>) {
  return <ol className={clsx('flex flex-col gap-3', className)} {...rest} />;
}
