import { describe, expect, it } from 'vitest';
import { describeAnalystError } from '@/components/analyst/errors';

describe('describeAnalystError', () => {
  it('prefers the detail of the problem', () => {
    const message = describeAnalystError(
      { status: 409, data: { title: 'Task already completed', detail: 'Another analyst won.' } },
      'fallback',
    );

    expect(message).toBe('Another analyst won.');
  });

  it('explains a conflict', () => {
    expect(describeAnalystError({ status: 409 }, 'fallback')).toBe(
      'This task was already completed by someone else.',
    );
  });

  it('explains a missing role', () => {
    expect(describeAnalystError({ status: 403 }, 'fallback')).toBe(
      'Your session does not have the analyst role.',
    );
  });

  it('falls back to the given message', () => {
    expect(describeAnalystError({ status: 500 }, 'The service is not available right now.')).toBe(
      'The service is not available right now.',
    );
  });
});
