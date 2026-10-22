/**
 * Temporary stand-in for the authenticated synthetic customer.
 *
 * The blueprint allows a synthetic session, but requires the server to enforce
 * identity. Until the backend exposes the real principal (and until the
 * session slice lands in Increment 2), the frontend sends a fixed customer id
 * as a request header so the mock handlers can scope results.
 *
 * Remove this file once `baseApi` derives the principal from a session slice.
 */
export const DEMO_CUSTOMER_HEADER = 'X-Demo-Customer-Id';

export const DEMO_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

export const DEMO_CUSTOMER_NAME = 'Demo Customer 01';

/**
 * Temporary stand-in for the authenticated analyst.
 *
 * The analyst endpoints of `docs/api/analyst-contract.md` require the
 * `DISPUTE_ANALYST` role. The header is sent per endpoint, because the
 * customer endpoints must not claim an analyst identity.
 */
export const DEMO_ANALYST_HEADER = 'X-Demo-Analyst-Id';

export const DEMO_ANALYST_ID = 'analyst-01';

export const DEMO_ANALYST_NAME = 'Analyst 01';
