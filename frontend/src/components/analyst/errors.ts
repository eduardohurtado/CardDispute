import type { ProblemDetails } from '@/types/dispute';

/**
 * Turns an analyst API error into a message the analyst can act on.
 *
 * The conflicts of the analyst endpoints have their own wording: a `409`
 * means another analyst was faster, not that the request was malformed.
 */
export function describeAnalystError(error: unknown, fallback: string): string {
  const problem = (error as { data?: ProblemDetails } | undefined)?.data;

  if (problem && typeof problem === 'object') {
    if (problem.detail) return problem.detail;
    if (problem.title) return problem.title;
  }

  const status = (error as { status?: number } | undefined)?.status;

  switch (status) {
    case 403:
      return 'Your session does not have the analyst role.';
    case 404:
      return 'This task does not exist.';
    case 409:
      return 'This task was already completed by someone else.';
    case 422:
      return 'The decision was rejected. Check the rationale and try again.';
    default:
      return fallback;
  }
}
