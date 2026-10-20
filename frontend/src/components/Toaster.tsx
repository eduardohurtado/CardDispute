import { useAppDispatch, useAppSelector } from '@/store';
import { dismissToast, selectToasts } from '@/store/slices/ui/uiSlice';

export function Toaster() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(selectToasts);

  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.variant}`} role="status">
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => dispatch(dismissToast(toast.id))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
