import { useAppDispatch, useAppSelector } from '@/store';
import { dismissToast, selectToasts, type ToastVariant } from '@/store/slices/ui/uiSlice';

const variantClasses: Record<ToastVariant, string> = {
  info: 'bg-blue-600',
  success: 'bg-green-600',
  error: 'bg-red-600',
};

export function Toaster() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(selectToasts);

  return (
    <div className="fixed right-4 bottom-4 flex flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-4 rounded-md px-4 py-3 text-white shadow-lg ${variantClasses[toast.variant]}`}
          role="status"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="cursor-pointer text-lg leading-none opacity-80 hover:opacity-100"
            aria-label="Dismiss notification"
            onClick={() => dispatch(dismissToast(toast.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
