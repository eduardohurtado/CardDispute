import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { DEMO_PASSWORD, DEMO_USERNAMES } from '@/config/demoSession';
import { useAppDispatch, useAppSelector } from '@/store';
import { useVerifyCredentialsMutation } from '@/store/api/authApi';
import {
  fallbackFor,
  landingFor,
  selectRole,
  selectSession,
  signedIn,
} from '@/store/slices/auth/authSlice';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAppSelector(selectSession);
  const role = useAppSelector(selectRole);
  const [verifyCredentials, { isLoading, error }] = useVerifyCredentialsMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;
  const target = fallbackFor(role, from ?? landingFor(role));

  if (session) {
    return <Navigate to={target} replace />;
  }

  const usernameError = submitted && !username.trim() ? 'Enter your username.' : undefined;
  const passwordError = submitted && !password ? 'Enter your password.' : undefined;
  const formError = loginErrorMessage(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (!username.trim() || !password) {
      return;
    }

    try {
      const account = await verifyCredentials({ username: username.trim(), password }).unwrap();

      dispatch(
        signedIn({
          username: account.username,
          password,
          displayName: account.displayName,
          role: account.role,
          customerId: account.customerId,
        }),
      );

      navigate(fallbackFor(account.role, from ?? landingFor(account.role)), { replace: true });
    } catch {
      // The mutation error is rendered inline below.
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-gray-600">Use one of the demo accounts to open the portal.</p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field id="username" label="Username" error={usernameError}>
          {(props) => (
            <input
              {...props}
              type="text"
              name="username"
              autoComplete="username"
              autoFocus
              className={inputClass}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          )}
        </Field>

        <Field id="password" label="Password" error={passwordError}>
          {(props) => (
            <input
              {...props}
              type="password"
              name="password"
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        {formError ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <section aria-labelledby="demo-accounts-heading" className="text-xs text-gray-600">
        <h2 id="demo-accounts-heading" className="font-medium text-gray-700">
          Demo accounts
        </h2>
        <p className="mt-1">
          {DEMO_USERNAMES.join(', ')} — password <code className="font-mono">{DEMO_PASSWORD}</code>{' '}
          unless the backend overrides it. Customers see their cases, analysts see the work queue.
        </p>
      </section>
    </main>
  );
}

function loginErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;

  const status = (error as { status?: number }).status;

  if (status === 401) {
    return 'Wrong username or password.';
  }

  return 'We could not reach the service. Check that the backend is running and try again.';
}
