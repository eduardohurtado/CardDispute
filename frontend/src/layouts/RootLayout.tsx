import { NavLink, Outlet, ScrollRestoration, useNavigation } from 'react-router';
import { paths } from '@/routes/paths';

export function RootLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== 'idle';

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">Card Dispute</span>
        <nav aria-label="Main">
          <NavLink to={paths.home} end>
            Home
          </NavLink>
        </nav>
      </header>
      {isNavigating && <div className="route-progress" role="progressbar" aria-label="Loading page" />}
      <main className="app-main">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
