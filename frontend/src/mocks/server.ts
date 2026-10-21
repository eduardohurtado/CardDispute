import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Mock API used by the Vitest suite. */
export const server = setupServer(...handlers);
