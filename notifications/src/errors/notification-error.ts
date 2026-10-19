const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const isRetryableStatus = (status: number) =>
  RETRYABLE_STATUS_CODES.has(status);

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export function isRetryableError(error: unknown): boolean {
  return error instanceof NotificationError ? error.retryable : true;
}
