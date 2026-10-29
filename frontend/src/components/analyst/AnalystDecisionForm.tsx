import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import type { DisputeDecisionType } from '@/types/dispute';
import type { AnalystDecisionRequest } from '@/types/analyst';

/** Options of the decision radio group, in the order the analyst reads them. */
const DECISION_OPTIONS: { value: DisputeDecisionType; label: string; hint: string }[] = [
  {
    value: 'DUPLICATE_SUPPORTED',
    label: 'Support duplicate',
    hint: 'The charge was a duplicate and the case is refunded.',
  },
  {
    value: 'NOT_SUPPORTED',
    label: 'Not supported',
    hint: 'The charge was a legitimate purchase and no refund is due.',
  },
];

export interface AnalystDecisionFormProps {
  /** Called with the decision and its rationale. */
  onSubmit: (values: Omit<AnalystDecisionRequest,"disputeId">) => void;
  /** True while the decision is being sent. */
  isSubmitting?: boolean;
  /** Error reported by the server, for example a rejected rationale. */
  submitError?: string | null;
}

/** Form an analyst uses to decide a task. The rationale is mandatory. */
export function AnalystDecisionForm({
  onSubmit,
  isSubmitting = false,
  submitError = null,
}: AnalystDecisionFormProps) {
  const [decision, setDecision] = useState<DisputeDecisionType | ''>('');
  const [rationale, setRationale] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!decision) {
      setValidationError('Pick the decision before submitting.');
      return;
    }

    if (rationale.trim().length === 0) {
      setValidationError('A rationale is required. The customer reads it.');
      return;
    }

    setValidationError(null);
    onSubmit({ decision, rationale: rationale.trim() });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend className="text-sm font-medium text-gray-700">Decision</legend>
        <div className="mt-2 space-y-2">
          {DECISION_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3 text-sm text-gray-900">
              <input
                type="radio"
                name="decision"
                value={option.value}
                checked={decision === option.value}
                onChange={() => {
                  setDecision(option.value);
                  setValidationError(null);
                }}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-xs text-gray-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id="analyst-rationale"
        label="Rationale"
        hint="Shown to the customer. Explain why you reached this decision."
        error={validationError ?? submitError ?? undefined}
      >
        {(props) => (
          <textarea
            {...props}
            rows={4}
            value={rationale}
            disabled={isSubmitting}
            onChange={(event) => {
              setRationale(event.target.value);
              setValidationError(null);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          />
        )}
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit decision'}
      </Button>
    </form>
  );
}
