import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from '@/components/ui/Field';

describe('Field', () => {
  it('labels the control', () => {
    render(
      <Field id="rationale" label="Rationale">
        {(props) => <input {...props} />}
      </Field>,
    );

    expect(screen.getByLabelText('Rationale')).toBeInTheDocument();
  });

  it('describes the control with the hint and the error', () => {
    render(
      <Field id="rationale" label="Rationale" hint="Shown to the customer." error="Required.">
        {(props) => <input {...props} />}
      </Field>,
    );

    const control = screen.getByLabelText('Rationale');

    expect(control).toHaveAccessibleDescription('Shown to the customer. Required.');
    expect(control).toHaveAttribute('aria-invalid', 'true');
  });

  it('announces the error', () => {
    render(
      <Field id="rationale" label="Rationale" error="A rationale is required.">
        {(props) => <input {...props} />}
      </Field>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('A rationale is required.');
  });
});
