import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_DEMO_USER, findDemoUser, type DemoUser } from '@/config/demoUsers';

export interface SessionState {
  /** Username of the synthetic demo user the app acts as. */
  username: string;
}

const initialState: SessionState = {
  username: DEFAULT_DEMO_USER.username,
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    switchDemoUser(state, action: PayloadAction<string>) {
      // Ignore unknown names so the session always points at a configured user.
      if (findDemoUser(action.payload)) {
        state.username = action.payload;
      }
    },
  },
  selectors: {
    selectUsername: (state) => state.username,
    selectCurrentUser: (state): DemoUser => findDemoUser(state.username) ?? DEFAULT_DEMO_USER,
  },
});

export const { switchDemoUser } = sessionSlice.actions;
export const { selectUsername, selectCurrentUser } = sessionSlice.selectors;
