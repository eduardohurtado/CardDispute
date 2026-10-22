import { clsx } from 'clsx';
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { StateBlock } from '@/components/ui/StateBlock';
import { disputePath, paths } from '@/routes/paths';
import { useAppDispatch } from '@/store';
import { useCreateDisputeMutation } from '@/store/api/disputeSubmissionApi';
import { useGetTransactionsQuery } from '@/store/api/transactionsApi';
import { showToast } from '@/store/slices/ui/uiSlice';
import type { Transaction } from '@/types/transaction';
import { describeApiError } from '@/utils/apiError';
import { formatAmount, formatDate } from '@/utils/format';
import {
  describeSubmitError,
  validateSubmission,
  type SubmitField,
} from '@/utils/submitErrors';

const DESCRIPTION_MAX_LENGTH = 500;
/** Enough for the synthetic seed data of one customer. */
const TRANSACTION_PAGE_SIZE = 100;

const fieldClass =
  'w-full rounded-md border bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800';

function transactionLabel(transaction: Transaction): string {
  return [
    transaction.merchantName,
    formatAmount(transaction.amount, transaction.currency),
    formatDate(transaction.occurredAt),
    `•••• ${transaction.cardLast4}`,
  ].join(' · ');
}

function isSameCharge(a: Transaction, b: Transaction): boolean {
  return a.amount === b.amount && a.currency === b.currency;
}

export default function SubmitDisputePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useGetTransactionsQuery({
    status: 'POSTED',
    size: TRANSACTION_PAGE_SIZE,
  });
  const [createDispute, { isLoading: isSubmitting }] = useCreateDisputeMutation();

  const [transactionId, setTransactionId] = useState('');
  const [candidateTransactionId, setCandidateTransactionId] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SubmitField, string>>>({});
  const [alert, setAlert] = useState<string>();

  const transactions = useMemo(() => data?.content ?? [], [data]);
  const selected = transactions.find((transaction) => transaction.transactionId === transactionId);

  // Charges with the same amount and currency are the likely duplicates, so they come first.
  const { sameCharges, otherCharges } = useMemo(() => {
    const others = transactions.filter((transaction) => transaction.transactionId !== transactionId);
    return {
      sameCharges: selected ? others.filter((transaction) => isSameCharge(transaction, selected)) : [],
      otherCharges: selected ? others.filter((transaction) => !isSameCharge(transaction, selected)) : others,
    };
  }, [selected, transactionId, transactions]);

  const clearFeedback = (field: SubmitField) => {
    setAlert(undefined);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleTransactionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setTransactionId(event.target.value);
    // The duplicate list depends on the chosen charge, so start it over.
    setCandidateTransactionId('');
    clearFeedback('transactionId');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateSubmission({ transactionId, candidateTransactionId, description });
    setFieldErrors(errors);
    setAlert(undefined);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const trimmed = description.trim();
    try {
      const created = await createDispute({
        transactionId,
        candidateTransactionId,
        reasonCode: 'POSSIBLE_DUPLICATE',
        ...(trimmed ? { description: trimmed } : {}),
      }).unwrap();

      dispatch(showToast('Dispute submitted', 'success'));
      navigate(disputePath(created.disputeId));
    } catch (submitError) {
      const view = describeSubmitError(submitError);
      setFieldErrors(view.fieldErrors);
      setAlert(view.alert);
      if (view.toast) {
        dispatch(showToast(view.toast, 'error'));
      }
    }
  };

  return (
    <section className="max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Report a possible duplicate card charge</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose the charge you want to dispute and the charge that looks like a duplicate of it.
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <Spinner label="Loading charges" />
          <span>Loading your charges…</span>
        </div>
      ) : isError ? (
        <StateBlock
          tone="danger"
          title="We could not load your charges"
          description={describeApiError(error, 'The service is not available right now.')}
        >
          <button
            type="button"
            className="mt-4 cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </StateBlock>
      ) : transactions.length < 2 ? (
        <StateBlock
          title="No posted charges to dispute"
          description="You need at least two posted charges to report a duplicate."
        />
      ) : (
        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <Field id="transaction" label="Transaction" error={fieldErrors.transactionId}>
            <select
              id="transaction"
              value={transactionId}
              onChange={handleTransactionChange}
              aria-invalid={Boolean(fieldErrors.transactionId)}
              aria-describedby={describedBy('transaction', fieldErrors.transactionId)}
              className={clsx(fieldClass, 'cursor-pointer', borderClass(fieldErrors.transactionId))}
            >
              <option value="">Choose a charge</option>
              {transactions.map((transaction) => (
                <option key={transaction.transactionId} value={transaction.transactionId}>
                  {transactionLabel(transaction)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="candidate"
            label="Possible duplicate"
            hint={selected ? undefined : 'Choose the transaction first.'}
            error={fieldErrors.candidateTransactionId}
          >
            <select
              id="candidate"
              value={candidateTransactionId}
              disabled={!selected}
              onChange={(event) => {
                setCandidateTransactionId(event.target.value);
                clearFeedback('candidateTransactionId');
              }}
              aria-invalid={Boolean(fieldErrors.candidateTransactionId)}
              aria-describedby={describedBy('candidate', fieldErrors.candidateTransactionId, !selected)}
              className={clsx(fieldClass, 'cursor-pointer', borderClass(fieldErrors.candidateTransactionId))}
            >
              <option value="">Choose the duplicate charge</option>
              {sameCharges.length > 0 ? (
                <optgroup label="Same amount">
                  {sameCharges.map((transaction) => (
                    <option key={transaction.transactionId} value={transaction.transactionId}>
                      {transactionLabel(transaction)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Other charges">
                {otherCharges.map((transaction) => (
                  <option key={transaction.transactionId} value={transaction.transactionId}>
                    {transactionLabel(transaction)}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>

          <Field id="reason" label="Reason">
            <select id="reason" value="POSSIBLE_DUPLICATE" disabled className={clsx(fieldClass, borderClass())}>
              <option value="POSSIBLE_DUPLICATE">Possible duplicate charge</option>
            </select>
          </Field>

          <Field
            id="description"
            label="Additional details (optional)"
            hint={`${description.length} / ${DESCRIPTION_MAX_LENGTH} characters`}
            error={fieldErrors.description}
          >
            <textarea
              id="description"
              rows={4}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearFeedback('description');
              }}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={describedBy('description', fieldErrors.description, true)}
              className={clsx(fieldClass, borderClass(fieldErrors.description))}
            />
          </Field>

          <p className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-300">
            Demonstration only; no actual refunds.
          </p>

          {alert ? (
            <div role="alert" className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
              {alert}
            </div>
          ) : null}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting…' : 'Submit dispute'}
            </button>
            <Link to={paths.disputes} className="text-sm font-medium text-blue-700 dark:text-blue-300 underline">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}

/** Id of the message under a field: its error, else its hint (when one is shown). */
function describedBy(id: string, error?: string, hasHint = false): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

function borderClass(error?: string): string {
  return error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700';
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Label, control, hint and error message of one form field. */
function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
