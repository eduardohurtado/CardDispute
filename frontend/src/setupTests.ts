import '@testing-library/jest-dom/vitest';
import { resetMockDb } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { createMatchMedia } from '@/test/matchMedia';

// jsdom doesn't implement scrollTo, which <ScrollRestoration /> calls.
window.scrollTo = () => {};

// jsdom has no modal dialog support: open/close the <dialog> like a browser would.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

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
