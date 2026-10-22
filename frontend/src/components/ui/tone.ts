/**
 * Semantic colour scale shared by the UI primitives.
 *
 * Tailwind cannot detect class names built at runtime, so every tone maps to
 * full class names. Adding a tone means adding one entry per map.
 */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const toneBadgeClasses: Record<Tone, string> = {
  neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-gray-300 dark:ring-gray-700',
  info: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-800',
  success: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 ring-green-200 dark:ring-green-800',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-amber-200 dark:ring-amber-800',
  danger: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800',
};

export const toneDotClasses: Record<Tone, string> = {
  neutral: 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900',
  info: 'border-blue-500 bg-blue-500',
  success: 'border-green-600 bg-green-600',
  warning: 'border-amber-500 bg-amber-500',
  danger: 'border-red-600 bg-red-600',
};

export const toneTextClasses: Record<Tone, string> = {
  neutral: 'text-gray-700 dark:text-gray-300',
  info: 'text-blue-700 dark:text-blue-300',
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-amber-800 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
};
