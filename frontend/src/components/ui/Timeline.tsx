import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

/**
 * Vertical list of events. Use it with `TimelineItem` children so the
 * chronology is exposed as an ordered list to assistive technology.
 */
export function Timeline({ className, ...rest }: ComponentProps<'ol'>) {
  return <ol className={clsx('flex flex-col gap-4', className)} {...rest} />;
}
