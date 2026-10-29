import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DemoRole } from '@/config/demoSession';
import { DEFAULT_DEMO_USER, DEMO_PASSWORD } from '@/config/demoUsers';

/** Key used to keep the demo session across reloads. */
export const AUTH_STORAGE_KEY = 'card-dispute.auth';

/**
 * Signed-in demo user.
 *
 * The password is kept because HTTP Basic requires it on every request: the
 * backend issues no token. `sessionStorage` survives a reload but not a tab
 * close. This is a POC trade-off and must be replaced by a real session.
 */
export interface AuthSession {
  username: string;
  password: string;
  displayName: string;
  role: DemoRole;
  /** Mock-only identity, used to scope the MSW handlers. */
  customerId?: string;
}

export interface AuthState {
  session: AuthSession;
}

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthSession>;

  return (
    typeof candidate.username === 'string' &&
    typeof candidate.password === 'string' &&
    typeof candidate.displayName === 'string' &&
    (candidate.role === 'CUSTOMER' || candidate.role === 'DISPUTE_ANALYST')
  );
}

/** Reads the stored session. Never throws: a corrupt entry is discarded. */
export function readStoredSession(): AuthSession | null {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    if (session) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode, quota). The in-memory session
    // still works for the current page.
  }
}

/**
 * The session the app always falls back to. The app has no login page, so
 * there is always an active identity — at minimum, the first demo customer.
 */
export const defaultSession: AuthSession = {
  username: DEFAULT_DEMO_USER.username,
  password: DEMO_PASSWORD,
  displayName: DEFAULT_DEMO_USER.displayName,
  role: DEFAULT_DEMO_USER.role,
  customerId: DEFAULT_DEMO_USER.mockCustomerId || undefined,
};

export const authSlice = createSlice({
  name: 'auth',
  // Falls back to customer01 when there is no stored session (e.g. fresh tab).
  initialState: { session: readStoredSession() ?? defaultSession } as AuthState,
  reducers: {
    signedIn(state, action: PayloadAction<AuthSession>) {
      state.session = action.payload;
      writeSession(action.payload);
    },
    /** Resets to the default demo user. No login page exists to return to. */
    signedOut(state) {
      state.session = defaultSession;
      writeSession(null);
    },
  },
  selectors: {
    selectSession: (state) => state.session,
    selectRole: (state): DemoRole | null => state.session?.role ?? null,
    selectIsAuthenticated: (state) => state.session !== null,
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export const { selectSession, selectRole, selectIsAuthenticated } = authSlice.selectors;

/** Landing page of a role. Analysts land on the work queue, customers on their cases. */
export function landingFor(role: DemoRole | null): string {
  return role === 'DISPUTE_ANALYST' ? '/analyst' : '/disputes';
}

/**
 * Whether a role may open a path. Used to decide where to go after sign-in;
 * the guards in `routes.tsx` are the enforcement point.
 */
export function canAccess(role: DemoRole | null, path: string): boolean {
  if (path.startsWith('/analyst')) return role === 'DISPUTE_ANALYST';
  if (path.startsWith('/disputes')) return role === 'CUSTOMER';
  return true;
}

/** The landing page for a path the role cannot open. */
export function fallbackFor(role: DemoRole | null, path: string): string {
  return canAccess(role, path) ? path : landingFor(role);
}
