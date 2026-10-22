import { NavLink, Outlet, ScrollRestoration, useNavigation } from 'react-router';
import { DemoUserPicker } from '@/components/session/DemoUserPicker';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { Toaster } from '@/components/Toaster';
import { paths } from '@/routes/paths';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectIsSidebarOpen, toggleSidebar } from '@/store/slices/ui/uiSlice';

// NavLink sets aria-current="page" on the active link.
const navLinkClass = 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 aria-[current=page]:font-semibold aria-[current=page]:underline';

export function RootLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== 'idle';
  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <button
          type="button"
          className="cursor-pointer text-xl"
          aria-label="Toggle navigation"
          aria-expanded={isSidebarOpen}
          aria-controls="main-nav"
          onClick={() => dispatch(toggleSidebar())}
        >
          ☰
        </button>
        <span className="font-semibold">Card Dispute</span>
        <div className="ml-auto flex items-center gap-4">
          <DemoUserPicker />
          <ThemePicker />
        </div>
      </header>
      {isNavigating && <div className="h-0.5 bg-blue-600" role="progressbar" aria-label="Loading page" />}
      <div className="flex">
        {isSidebarOpen && (
          <nav id="main-nav" className="flex min-w-48 flex-col gap-2 border-r border-gray-200 dark:border-gray-700 p-6" aria-label="Main">
            <NavLink to={paths.home} end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to={paths.disputes} end className={navLinkClass}>
              My Disputes
            </NavLink>
            <NavLink to={paths.newDispute} end className={navLinkClass}>
              Report a charge
            </NavLink>
          </nav>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
