import { Link } from 'react-router';
import { paths } from '@/routes/paths';

export function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to={paths.home}>Back to home</Link>
    </section>
  );
}
