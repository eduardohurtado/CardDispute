import { describe, expect, it } from 'vitest';
import { describeSubmitError, validateSubmission } from '@/utils/submitErrors';

function apiError(status: number, data: Record<string, unknown>) {
  return { status, data: { type: 'about:blank', title: 'Error', status, ...data } };
}

describe('describeSubmitError', () => {
  it('maps validation violations to fields', () => {
    const view = describeSubmitError(
      apiError(400, {
        errorCode: 'VALIDATION_FAILED',
        violations: [{ field: 'candidateTransactionId', message: 'must not be null' }],
      }),
    );

    expect(view.fieldErrors.candidateTransactionId).toBe('Choose the charge that looks like a duplicate.');
    expect(view.alert).toBe('Check the highlighted fields and try again.');
  });

  it('explains an existing open dispute', () => {
    const view = describeSubmitError(apiError(409, { errorCode: 'OPEN_DISPUTE_EXISTS' }));

    expect(view.alert).toMatch(/already an open dispute/);
  });

  it('shows the backend detail of a business rule', () => {
    const view = describeSubmitError(
      apiError(422, { errorCode: 'TRANSACTION_NOT_POSTED', detail: 'Only posted transactions can be disputed' }),
    );

    expect(view.alert).toBe('Only posted transactions can be disputed');
  });

  it('points to the demo user menu on an auth failure', () => {
    expect(describeSubmitError(apiError(401, {})).alert).toMatch(/Demo user menu/);
  });

  it('sends unexpected failures to a toast', () => {
    const view = describeSubmitError({ status: 'FETCH_ERROR', error: 'offline' });

    expect(view.alert).toBeUndefined();
    expect(view.toast).toBe('We could not submit your dispute. Please try again.');
  });
});

describe('validateSubmission', () => {
  it('requires two different charges', () => {
    expect(
      validateSubmission({ transactionId: 'a', candidateTransactionId: 'a', description: '' }),
    ).toEqual({ candidateTransactionId: 'Choose two different charges.' });
  });

  it('limits the description to 500 characters', () => {
    expect(
      validateSubmission({ transactionId: 'a', candidateTransactionId: 'b', description: 'x'.repeat(501) }),
    ).toEqual({ description: 'Use 500 characters or fewer.' });
  });
});
