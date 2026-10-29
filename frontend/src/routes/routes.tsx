import type { RouteObject } from "react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import { RootLayout } from "@/layouts/RootLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        // Lazy-loaded so each page gets its own bundle chunk.
        lazy: async () => ({
          Component: (await import("@/pages/HomePage")).default,
        }),
      },
      {
        // RequireAuth is a safety net. In practice the app always has a session
        // (customer01 by default), so this redirect never fires.
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole role="CUSTOMER" />,
            children: [
              {
                path: "disputes",
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
            ],
          },
          {
            element: <RequireRole role="DISPUTE_ANALYST" />,
            children: [
              {
                path: "analyst",
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
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
