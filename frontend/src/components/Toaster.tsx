import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { dismissToast, selectToasts, type Toast, type ToastVariant } from '@/store/slices/ui/uiSlice';

/** How long a toast stays on screen before it starts fading out. */
export const TOAST_DURATION_MS = 5000;
/** Length of the fade-out. Matches the `duration-300` class below. */
export const TOAST_FADE_MS = 300;

const variantClasses: Record<ToastVariant, string> = {
  info: 'bg-blue-600',
  success: 'bg-green-600',
  error: 'bg-red-600',
};

export function Toaster() {
  const toasts = useAppSelector(selectToasts);

  return (
    <div className="fixed right-4 bottom-4 flex flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

/**
 * One toast. It closes itself after `TOAST_DURATION_MS`, or when its button is
 * pressed, by fading out and then leaving the store. The countdown pauses while
 * the pointer or keyboard focus is on the toast, so it can still be read.
 */
function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPaused = isHovered || isFocused;

  // Countdown; it starts again from the full duration after a pause.
  useEffect(() => {
    if (isLeaving || isPaused) {
      return;
    }
    const timer = window.setTimeout(() => setIsLeaving(true), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isLeaving, isPaused]);

  // Remove the toast once the fade-out has finished.
  useEffect(() => {
    if (!isLeaving) {
      return;
    }
    const timer = window.setTimeout(() => dispatch(dismissToast(toast.id)), TOAST_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [dispatch, isLeaving, toast.id]);

  return (
    <div
      role="status"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={clsx(
        'flex items-center gap-4 rounded-md px-4 py-3 text-white shadow-lg transition-opacity duration-300 motion-reduce:transition-none',
        variantClasses[toast.variant],
        isLeaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        className="cursor-pointer text-lg leading-none opacity-80 hover:opacity-100"
        aria-label="Dismiss notification"
        onClick={() => setIsLeaving(true)}
      >
        ×
      </button>
    </div>
  );
}
