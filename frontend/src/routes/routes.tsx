import type { RouteObject } from "react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { RootLayout } from "@/layouts/RootLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const routes: RouteObject[] = [
  {
    path: "/login",
    lazy: async () => ({
      Component: (await import("@/pages/LoginPage")).default,
    }),
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            // Lazy-loaded so each page gets its own bundle chunk.
            lazy: async () => ({
              Component: (await import("@/pages/HomePage")).default,
            }),
          },
          {
            path: "disputes",
            element: <RequireRole role="CUSTOMER" />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import("@/pages/MyDisputesPage")).default,
                }),
              },
              {
        // Static segment, so it wins over ":id".
        path: "new",
        lazy: async () => ({
          Component: (await import("@/pages/SubmitDisputePage")).default,
        }),
      },
      {
                path: ":id",
                lazy: async () => ({
                  Component: (await import("@/pages/DisputeDetailPage")).default,
                }),
              },
            ],
          },
          {
            path: "analyst",
            element: <RequireRole role="DISPUTE_ANALYST" />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import("@/pages/AnalystQueuePage")).default,
                }),
              },
              {
                path: "tasks/:taskId",
                lazy: async () => ({
                  Component: (await import("@/pages/AnalystReviewPage")).default,
                }),
              },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
