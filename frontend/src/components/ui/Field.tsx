import type { ReactNode } from 'react';

/** Props a control receives from `Field` to stay accessible. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean | undefined;
}

export interface FieldProps {
  /** Id of the control. The label points at it. */
  id: string;
  /** Label of the control. */
  label: string;
  /** Validation message. Announced assertively when present. */
  error?: string;
  /** Optional explanation shown under the label. */
  hint?: string;
  /** Renders the control with the accessibility wiring already applied. */
  children: (props: FieldControlProps) => ReactNode;
}

/**
 * Label, hint and error message of a single form control.
 *
 * The control is rendered through a function so the `aria-describedby` and
 * `aria-invalid` wiring lives in one place instead of being repeated at
 * every call site.
 */
export function Field({ id, label, error, hint, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
