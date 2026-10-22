import { useId, useLayoutEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react';

export interface ConfirmDialogProps {
  /** Question shown as the dialog title, for example "Switch user?". */
  title: string;
  /** Explanation of what happens on confirm. */
  children: ReactNode;
  /** Label of the confirm button, for example "Switch user". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Called for Cancel, Esc and a click on the backdrop. */
  onCancel: () => void;
}

/**
 * Modal confirmation built on the native `<dialog>`, which provides the focus
 * trap, the inert page behind it and Esc handling.
 *
 * Render it only while a confirmation is pending; it opens on mount.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Layout effect, so `close()` runs before React removes the element and the
  // browser can return focus to the control that opened the dialog.
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const handleCancelEvent = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Esc: let the parent unmount the dialog instead of the browser closing it.
    event.preventDefault();
    onCancel();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    // The content fills the dialog, so a click on the dialog itself is on the backdrop.
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancelEvent}
      onClick={handleBackdropClick}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-lg bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50 dark:bg-gray-900 dark:text-gray-100"
    >
      <div className="space-y-4 p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400">
          {children}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
