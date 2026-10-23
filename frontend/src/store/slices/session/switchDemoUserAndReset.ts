import { findDemoUser, DEMO_PASSWORD } from '@/config/demoUsers';
import { baseApi } from '@/store/api/baseApi';
import type { AppThunk } from '@/store/store';
import { signedIn, selectSession } from '@/store/slices/auth/authSlice';
import { showToast } from '@/store/slices/ui/uiSlice';

/**
 * Switches the demo user with a soft reset of the app state.
 *
 * Navigation is not part of it: the caller moves to the landing page first, so
 * no page of the previous user refetches with the new credentials.
 *
 * Returns false (and changes nothing) for an unknown or already active user.
 */
export function switchDemoUserAndReset(username: string): AppThunk<boolean> {
  return (dispatch, getState) => {
    const user = findDemoUser(username);
    if (!user || selectSession(getState()).username === username) {
      return false;
    }

    // Stops polling and drops cached data before the new credentials apply.
    dispatch(baseApi.util.resetApiState());
    // Updates auth session — this also triggers uiSlice's soft reset
    // (clears toasts, reopens sidebar) via its extraReducers listener.
    dispatch(signedIn({
      username: user.username,
      password: DEMO_PASSWORD,
      displayName: user.displayName,
      role: user.role,
      customerId: user.mockCustomerId || undefined,
    }));
    dispatch(showToast(`Now using ${user.displayName}`, 'info'));
    return true;
  };
}
