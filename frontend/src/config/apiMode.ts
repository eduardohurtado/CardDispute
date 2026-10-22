/**
 * Whether the app talks to the Mock Service Worker instead of a backend.
 *
 * Tests set `VITE_USE_MOCKS=true` in `.env.test`; the real API is used
 * everywhere else unless the flag is set explicitly.
 */
export const isMockApi = import.meta.env.VITE_USE_MOCKS === 'true';
