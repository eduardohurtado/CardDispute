import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DEMO_USERS, findDemoUser, type DemoUser } from '@/config/demoUsers';
import { paths } from '@/routes/paths';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectUsername } from '@/store/slices/session/sessionSlice';
import { switchDemoUserAndReset } from '@/store/slices/session/switchDemoUserAndReset';

/**
 * Switches the synthetic demo user the app acts as. The backend still checks
 * identity and ownership on every request; this only picks the credentials.
 *
 * A switch asks for confirmation, then soft-resets the app on the home page.
 */
export function DemoUserPicker() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const username = useAppSelector(selectUsername);
  const [pendingUser, setPendingUser] = useState<DemoUser>();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = findDemoUser(event.target.value);
    // The select stays on the current user until the switch is confirmed.
    if (next && next.username !== username) {
      setPendingUser(next);
    }
  };

  const handleConfirm = async () => {
    if (!pendingUser) {
      return;
    }
    setPendingUser(undefined);
    // Leave the current page first, so it does not refetch with the new
    // credentials while it is still on screen.
    await navigate(paths.home, { replace: true });
    dispatch(switchDemoUserAndReset(pendingUser.username));
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="demo-user" className="text-sm text-gray-600 dark:text-gray-400">
        Demo user
      </label>
      <select
        id="demo-user"
        value={username}
        onChange={handleChange}
        className="cursor-pointer rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
      >
        {DEMO_USERS.map((user) => (
          <option key={user.username} value={user.username}>
            {user.displayName}
          </option>
        ))}
      </select>

      {pendingUser ? (
        <ConfirmDialog
          title={`Switch to ${pendingUser.displayName}?`}
          confirmLabel="Switch user"
          onConfirm={handleConfirm}
          onCancel={() => setPendingUser(undefined)}
        >
          <p>
            You will go back to the home page, and everything from this session is cleared: open
            pages, form entries, loaded data and notifications.
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
