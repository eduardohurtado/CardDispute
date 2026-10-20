import { NavLink, Outlet, ScrollRestoration, useNavigation } from 'react-router';
import { Toaster } from '@/components/Toaster';
import { paths } from '@/routes/paths';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectIsSidebarOpen, toggleSidebar } from '@/store/slices/ui/uiSlice';

export function RootLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== 'idle';
  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="menu-button"
          aria-label="Toggle navigation"
          aria-expanded={isSidebarOpen}
          aria-controls="main-nav"
          onClick={() => dispatch(toggleSidebar())}
        >
          ☰
        </button>
        <span className="app-title">Card Dispute</span>
      </header>
      {isNavigating && <div className="route-progress" role="progressbar" aria-label="Loading page" />}
      <div className="app-body">
        {isSidebarOpen && (
          <nav id="main-nav" className="app-sidebar" aria-label="Main">
            <NavLink to={paths.home} end>
              Home
            </NavLink>
          </nav>
        )}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
