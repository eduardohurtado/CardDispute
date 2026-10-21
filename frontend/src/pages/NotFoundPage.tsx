import { Link } from 'react-router';
import { paths } from '@/routes/paths';

export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-gray-600">The page you are looking for does not exist.</p>
      <Link to={paths.home} className="text-blue-600 underline hover:text-blue-800">Back to home</Link>
    </section>
  );
}
