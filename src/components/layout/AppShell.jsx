import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui';
import { StreakDisplay } from './StreakDisplay';

// All primary navigation links (frontend.md / DESIGN_SYSTEM.md sidebar order).
const NAV_LINKS = [
  { to: '/', label: 'Daily', end: true },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/archive', label: 'Archive' },
  { to: '/search', label: 'Search' },
  { to: '/monthly', label: 'Monthly' },
];

// Reduced set shown in the mobile bottom navigation.
const MOBILE_LINKS = [
  { to: '/', label: 'Daily', end: true },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/settings', label: 'Settings' },
];

function sidebarLinkClass({ isActive }) {
  return isActive
    ? 'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-950 bg-ink-100 font-medium border-l-2 border-accent pl-[10px]'
    : 'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-500 hover:text-ink-950 hover:bg-ink-100 transition-colors';
}

function bottomLinkClass({ isActive }) {
  return isActive
    ? 'flex flex-1 items-center justify-center text-2xs font-medium text-ink-950'
    : 'flex flex-1 items-center justify-center text-2xs font-medium text-ink-500';
}

export function AppShell() {
  const { streak } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div>
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-52 border-r border-ink-300 bg-white fixed top-0 left-0 h-screen flex-col">
        <div className="px-3 py-4">
          <span className="text-lg text-ink-950 font-semibold tracking-tight">Vaishu</span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={sidebarLinkClass}>
              {link.label}
            </NavLink>
          ))}
          <div className="h-px bg-ink-200 my-2" />
          <NavLink to="/settings" className={sidebarLinkClass}>
            Settings
          </NavLink>
        </nav>

        <div className="px-3 py-2 border-t border-ink-200">
          <StreakDisplay streak={streak} className="block" />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="mt-1 w-full justify-start">
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-52 min-h-screen bg-ink-50 pb-16 md:pb-0">
        {/* Header with streak display shell */}
        <header className="h-14 border-b border-ink-300 bg-white flex items-center justify-between px-6">
          <span className="text-2xs text-ink-500 font-medium uppercase tracking-widest md:hidden">
            Vaishu
          </span>
          <StreakDisplay streak={streak} className="ml-auto" />
        </header>

        <main className="max-w-2xl mx-auto px-6 py-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-ink-300 flex">
        {MOBILE_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={bottomLinkClass}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
