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
    <section role="alert" className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-gray-600">{message}</p>
      <Link to={paths.home} className="text-blue-600 underline hover:text-blue-800">Back to home</Link>
    </section>
  );
}
