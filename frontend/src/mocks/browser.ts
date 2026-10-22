import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Mock API used by the dev server when `VITE_USE_MOCKS` is enabled. */
export const worker = setupWorker(...handlers);
