/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for backend API calls. Defaults to `/api`. */
  readonly VITE_API_URL?: string;
  /** Set to `true` to serve the API from the MSW browser worker. */
  readonly VITE_USE_MOCKS?: string;
  /** Password of the synthetic demo users. Defaults to `demo`. */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
