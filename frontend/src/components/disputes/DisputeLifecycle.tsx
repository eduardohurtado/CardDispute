import { Lifecycle } from '@/components/ui/Lifecycle';
import { LifecycleStep } from '@/components/ui/LifecycleStep';
import type { Dispute } from '@/types/dispute';
import { buildLifecycle } from './lifecycle';

/** The phases the case has travelled through, and where it stands now. */
export function DisputeLifecycle({ dispute }: { dispute: Dispute }) {
  const steps = buildLifecycle(dispute);

  return (
    <Lifecycle aria-label="Case progress">
      {steps.map((step) => (
        <LifecycleStep key={step.phase} state={step.state}>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.label}</p>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
        </LifecycleStep>
      ))}
    </Lifecycle>
  );
}
