import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ThemeSync } from '@/components/theme/ThemeSync';
import type { DemoRole } from '@/config/demoSession';
import { DEMO_CUSTOMER_ID } from '@/config/demoSession';
import { routes } from '@/routes/routes';
import { makeStore, type RootState } from '@/store';
import type { AuthSession } from '@/store/slices/auth/authSlice';

interface Options {
  /** URL to start on. Defaults to `/`. */
  route?: string;
  preloadedState?: Partial<RootState>;
  /** Role of the signed-in user. Defaults to `CUSTOMER`. */
  role?: DemoRole;
}

const demoSession = (role: DemoRole): AuthSession =>
  role === 'DISPUTE_ANALYST'
    ? {
        username: 'analyst01',
        password: 'demo',
        displayName: 'Analyst 01',
        role,
      }
    : {
        username: 'customer01',
        password: 'demo',
        displayName: 'Demo Customer 01',
        role: 'CUSTOMER',
        customerId: DEMO_CUSTOMER_ID,
      };

/** Renders the full app (routes + a fresh Redux store) for integration tests. */
export function renderWithProviders({
  route = '/',
  preloadedState,
  role = 'CUSTOMER',
}: Options = {}) {
  const auth = preloadedState?.auth ?? {
    session: demoSession(role),
  };
  const store = makeStore({ ...preloadedState, auth }, { refetchOnFocus: false });
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const result = render(
    <Provider store={store}>
      <ThemeSync />
      <RouterProvider router={router} />
    </Provider>,
  );
  return { store, router, ...result };
}
