import { clsx } from 'clsx';

/** Busy indicator. Announced as a status so screen readers notice the wait. */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx(
        'inline-block size-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700',
        className,
      )}
    />
  );
}
