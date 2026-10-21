/**
 * Semantic colour scale shared by the UI primitives.
 *
 * Tailwind cannot detect class names built at runtime, so every tone maps to
 * full class names. Adding a tone means adding one entry per map.
 */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const toneBadgeClasses: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700 ring-gray-300',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
};

export const toneDotClasses: Record<Tone, string> = {
  neutral: 'border-gray-400 bg-white',
  info: 'border-blue-500 bg-blue-500',
  success: 'border-green-600 bg-green-600',
  warning: 'border-amber-500 bg-amber-500',
  danger: 'border-red-600 bg-red-600',
};

export const toneTextClasses: Record<Tone, string> = {
  neutral: 'text-gray-700',
  info: 'text-blue-700',
  success: 'text-green-700',
  warning: 'text-amber-800',
  danger: 'text-red-700',
};
