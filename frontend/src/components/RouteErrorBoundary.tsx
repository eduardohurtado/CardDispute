import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { paths } from '@/routes/paths';

export function RouteErrorBoundary() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = typeof error.data === 'string' ? error.data : message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <section role="alert" className="app-main">
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to={paths.home}>Back to home</Link>
    </section>
  );
}
