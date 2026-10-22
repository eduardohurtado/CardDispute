import type { ApiProblem } from '@/types/api';
import { describeApiError } from '@/utils/apiError';

/** Fields of the submit dispute form, named like `CreateDisputeRequest`. */
export type SubmitField = 'transactionId' | 'candidateTransactionId' | 'reasonCode' | 'description';

/** Where a failed submission should be shown on the form. */
export interface SubmitErrorView {
  /** Message for the alert above the submit button. */
  alert?: string;
  /** Messages next to individual fields. */
  fieldErrors: Partial<Record<SubmitField, string>>;
  /** Unexpected failures go to a toast; the form keeps its values. */
  toast?: string;
}

const FIELDS: readonly SubmitField[] = ['transactionId', 'candidateTransactionId', 'reasonCode', 'description'];

const FIELD_MESSAGES: Record<SubmitField, string> = {
  transactionId: 'Choose the charge you want to dispute.',
  candidateTransactionId: 'Choose the charge that looks like a duplicate.',
  reasonCode: 'Choose a reason.',
  description: 'Use 500 characters or fewer.',
};

function isSubmitField(field: string): field is SubmitField {
  return (FIELDS as readonly string[]).includes(field);
}

/**
 * Maps an RTK Query error of `POST /api/v1/disputes` to form messages.
 * Business errors use the backend `errorCode`; the backend `detail` is shown
 * when there is no friendlier message.
 */
export function describeSubmitError(error: unknown): SubmitErrorView {
  const status = (error as { status?: unknown } | undefined)?.status;
  const problem = (error as { data?: ApiProblem } | undefined)?.data;
  const detail = typeof problem === 'object' && problem ? problem.detail : undefined;
  const errorCode = typeof problem === 'object' && problem ? problem.errorCode : undefined;

  if (status === 400 && problem?.violations?.length) {
    const fieldErrors: SubmitErrorView['fieldErrors'] = {};
    for (const violation of problem.violations) {
      if (isSubmitField(violation.field)) {
        fieldErrors[violation.field] = FIELD_MESSAGES[violation.field];
      }
    }
    return { alert: 'Check the highlighted fields and try again.', fieldErrors };
  }

  if (status === 409 && errorCode === 'OPEN_DISPUTE_EXISTS') {
    return {
      alert:
        'There is already an open dispute for one of these charges. You can follow it in My Disputes.',
      fieldErrors: {},
    };
  }

  if (status === 404) {
    return {
      alert: 'One of the selected charges was not found. Reload the page and choose again.',
      fieldErrors: {},
    };
  }

  if (status === 409 || status === 422 || status === 400) {
    return { alert: detail ?? 'These charges cannot be disputed.', fieldErrors: {} };
  }

  if (status === 401 || status === 403) {
    return {
      alert:
        'The demo user is not allowed to submit disputes. Pick a customer in the Demo user menu.',
      fieldErrors: {},
    };
  }

  return {
    toast: describeApiError(error, 'We could not submit your dispute. Please try again.'),
    fieldErrors: {},
  };
}

/** Client-side checks run before anything is sent. */
export function validateSubmission(values: {
  transactionId: string;
  candidateTransactionId: string;
  description: string;
}): Partial<Record<SubmitField, string>> {
  const errors: Partial<Record<SubmitField, string>> = {};

  if (!values.transactionId) {
    errors.transactionId = FIELD_MESSAGES.transactionId;
  }
  if (!values.candidateTransactionId) {
    errors.candidateTransactionId = FIELD_MESSAGES.candidateTransactionId;
  } else if (values.candidateTransactionId === values.transactionId) {
    errors.candidateTransactionId = 'Choose two different charges.';
  }
  if (values.description.length > 500) {
    errors.description = FIELD_MESSAGES.description;
  }

  return errors;
}
