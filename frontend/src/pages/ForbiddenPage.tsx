import { Link } from 'react-router';
import { StateBlock } from '@/components/ui/StateBlock';
import type { DemoRole } from '@/config/demoSession';
import { useAppSelector } from '@/store';
import { landingFor, selectRole } from '@/store/slices/auth/authSlice';

/** Shown when a signed-in user opens an area of the other role. */
export function ForbiddenPage({ required }: { required: DemoRole }) {
  const role = useAppSelector(selectRole);
  const audience = required === 'DISPUTE_ANALYST' ? 'analysts' : 'customers';

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Not available</h1>
      <StateBlock
        tone="danger"
        title={`This area is for ${audience}`}
        description="Your account does not have access to this page."
      >
        <Link
          to={landingFor(role)}
          className="mt-4 inline-block font-medium text-blue-700 underline"
        >
          Go to your workspace
        </Link>
      </StateBlock>
    </section>
  );
}
