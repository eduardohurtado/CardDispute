import type { ProblemDetails } from '@/types/dispute';

/**
 * Page envelope returned by the backend list endpoints
 * (`common/web/PageResponse.java`).
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** One field error of a `400 VALIDATION_FAILED` response. */
export interface FieldViolation {
  field: string;
  message: string;
}

/**
 * Problem Details with the extra properties the backend adds
 * (`GlobalExceptionHandler.java`).
 */
export interface ApiProblem extends ProblemDetails {
  /** Stable machine code, for example `OPEN_DISPUTE_EXISTS`. */
  errorCode?: string;
  violations?: FieldViolation[];
  correlationId?: string;
}
