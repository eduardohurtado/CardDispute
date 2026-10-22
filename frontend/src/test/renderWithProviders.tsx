import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ThemeSync } from '@/components/theme/ThemeSync';
import { routes } from '@/routes/routes';
import { makeStore, type RootState } from '@/store';

interface Options {
  /** URL to start on. Defaults to `/`. */
  route?: string;
  preloadedState?: Partial<RootState>;
}

/** Renders the full app (routes + a fresh Redux store) for integration tests. */
export function renderWithProviders({ route = '/', preloadedState }: Options = {}) {
  const store = makeStore(preloadedState, { refetchOnFocus: false });
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const result = render(
    <Provider store={store}>
      <ThemeSync />
      <RouterProvider router={router} />
    </Provider>,
  );
  return { store, router, ...result };
}
