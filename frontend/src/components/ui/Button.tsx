import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

/**
 * Semantic colour of a button.
 *
 * Tailwind cannot detect class names built at runtime, so every variant maps
 * to full class names.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800',
  secondary: 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export interface ButtonProps extends ComponentProps<'button'> {
  /** Semantic colour of the button. */
  variant?: ButtonVariant;
}

/** Standard action button. Use `type="submit"` for form actions. */
export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...rest}
    />
  );
}
