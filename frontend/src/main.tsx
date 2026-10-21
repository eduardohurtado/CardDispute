import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import { router } from "@/routes/router";
import { store } from "@/store";
import "./index.css";

async function startMockApi(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS !== "true") {
    return;
  }

  const { worker } = await import("@/mocks/browser");
  await worker.start({ onUnhandledFrame: "bypass" });
}

async function bootstrap(): Promise<void> {
  await startMockApi();

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element #root not found");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StrictMode>,
  );
}

bootstrap();
