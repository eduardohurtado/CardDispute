import '@testing-library/jest-dom/vitest';
import { resetMockDb } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { createMatchMedia } from '@/test/matchMedia';

// jsdom doesn't implement scrollTo, which <ScrollRestoration /> calls.
window.scrollTo = () => {};

// jsdom has no matchMedia either. The default reports a light OS theme;
// a test can install its own with `createMatchMedia(true)`.
window.matchMedia = createMatchMedia(false).matchMedia;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockDb();
  // Theme state lives on <html> and in storage, so reset it between tests.
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
  window.matchMedia = createMatchMedia(false).matchMedia;
});
afterAll(() => server.close());
