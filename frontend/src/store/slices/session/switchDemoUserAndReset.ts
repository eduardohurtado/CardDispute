import { findDemoUser } from '@/config/demoUsers';
import { baseApi } from '@/store/api/baseApi';
import type { AppThunk } from '@/store/store';
import { selectUsername, switchDemoUser } from './sessionSlice';
import { showToast } from '@/store/slices/ui/uiSlice';

/**
 * Switches the demo user with a soft reset of the app state.
 *
 * Navigation is not part of it: the caller moves to the home page first, so
 * no page of the previous user refetches with the new credentials.
 *
 * Returns false (and changes nothing) for an unknown or already active user.
 */
export function switchDemoUserAndReset(username: string): AppThunk<boolean> {
  return (dispatch, getState) => {
    const user = findDemoUser(username);
    if (!user || selectUsername(getState()) === username) {
      return false;
    }

    // Stops polling and drops cached data before the new credentials apply.
    dispatch(baseApi.util.resetApiState());
    // Updates the session; other slices reset themselves on this action.
    dispatch(switchDemoUser(username));
    dispatch(showToast(`Now using ${user.displayName}`, 'info'));
    return true;
  };
}
