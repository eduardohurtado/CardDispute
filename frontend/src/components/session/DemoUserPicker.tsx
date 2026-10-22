import type { ChangeEvent } from 'react';
import { DEMO_USERS } from '@/config/demoUsers';
import { baseApi, useAppDispatch, useAppSelector } from '@/store';
import { selectUsername, switchDemoUser } from '@/store/slices/session/sessionSlice';

/**
 * Switches the synthetic demo user the app acts as. The backend still checks
 * identity and ownership on every request; this only picks the credentials.
 */
export function DemoUserPicker() {
  const dispatch = useAppDispatch();
  const username = useAppSelector(selectUsername);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch(switchDemoUser(event.target.value));
    // Drop cached data of the previous user so it is never shown to the next one.
    dispatch(baseApi.util.resetApiState());
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      <label htmlFor="demo-user" className="text-sm text-gray-600">
        Demo user
      </label>
      <select
        id="demo-user"
        value={username}
        onChange={handleChange}
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {DEMO_USERS.map((user) => (
          <option key={user.username} value={user.username}>
            {user.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
