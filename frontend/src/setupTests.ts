import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollTo, which <ScrollRestoration /> calls.
window.scrollTo = () => {};
