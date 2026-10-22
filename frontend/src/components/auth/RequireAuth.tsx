import { Navigate, Outlet, useLocation } from 'react-router';
import { paths } from '@/routes/paths';
import { useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/store/slices/auth/authSlice';

/** Sends anonymous visitors to the login screen, remembering where they were going. */
export function RequireAuth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={paths.login} state={{ from }} replace />;
  }

  return <Outlet />;
}
