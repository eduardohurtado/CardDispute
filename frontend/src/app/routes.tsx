import type { RouteObject } from 'react-router';
import { paths } from '@/app/paths';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { RootLayout } from '@/layouts/RootLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: paths.home,
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        // Lazy-loaded so each page gets its own bundle chunk.
        lazy: async () => ({ Component: (await import('@/pages/HomePage')).default }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
