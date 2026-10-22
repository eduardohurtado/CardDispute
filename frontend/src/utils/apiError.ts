import type { ProblemDetails } from '@/types/dispute';

/**
 * Turns an RTK Query error into a message the customer can act on.
 *
 * The backend answers with Problem Details, so the detail of the problem is
 * preferred over the generic status message.
 */
export function describeApiError(error: unknown, fallback: string): string {
  const problem = (error as { data?: ProblemDetails } | undefined)?.data;

  if (problem && typeof problem === 'object') {
    if (problem.detail) return problem.detail;
    if (problem.title) return problem.title;
  }

  const status = (error as { status?: number } | undefined)?.status;
  if (status === 404) return 'The case was not found.';
  if (status === 403) return 'You do not have access to this case.';

  return fallback;
}

/** True when the request failed because the resource does not exist. */
export function isNotFound(error: unknown): boolean {
  return (error as { status?: number } | undefined)?.status === 404;
}
