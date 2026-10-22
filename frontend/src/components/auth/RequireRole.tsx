import { Outlet } from 'react-router';
import type { DemoRole } from '@/config/demoSession';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { useAppSelector } from '@/store';
import { selectRole } from '@/store/slices/auth/authSlice';

/**
 * Allows only the given role through. The backend enforces the same rule; this
 * guard keeps customers off the analyst workspace and vice versa.
 */
export function RequireRole({ role }: { role: DemoRole }) {
  const currentRole = useAppSelector(selectRole);

  if (currentRole !== role) {
    return <ForbiddenPage required={role} />;
  }

  return <Outlet />;
}
