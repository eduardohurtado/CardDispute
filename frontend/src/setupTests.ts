import '@testing-library/jest-dom/vitest';
import { resetMockDb } from '@/mocks/handlers';
import { server } from '@/mocks/server';

// jsdom doesn't implement scrollTo, which <ScrollRestoration /> calls.
window.scrollTo = () => {};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockDb();
});
afterAll(() => server.close());
