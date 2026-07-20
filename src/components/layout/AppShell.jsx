import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui';
import { StreakDisplay } from './StreakDisplay';
import { Dedication } from './Dedication';
import { InstallPrompt } from '../../features/pwa/InstallPrompt';

// Taps on the "Vaishu" logo needed to reveal the hidden dedication.
const REVEAL_TAPS = 3;

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
  { to: '/community', label: 'Community' },
];

// Primary set shown directly in the mobile bottom navigation. Each carries an icon
// so the PWA bottom bar reads as icons (with a small label beneath) rather than text
// only. The 5th slot is a "More" button that opens the sheet below — this keeps the
// bar to five comfortable taps while making every feature reachable in the PWA.
const MOBILE_LINKS = [
  { to: '/', label: 'Daily', icon: '📰', end: true },
  { to: '/bookmarks', label: 'Bookmarks', icon: '★' },
  { to: '/quiz', label: 'Quiz', icon: '📝' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
];

// Overflow links surfaced through the mobile "More" sheet so the PWA reaches full
// feature parity with the desktop sidebar (Flashcards, Archive, Search, Monthly,
// Settings — the items that do not fit in the bottom bar).
const MORE_LINKS = [
  { to: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { to: '/archive', label: 'Archive', icon: '🗄️' },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/monthly', label: 'Monthly', icon: '📅' },
  { to: '/community', label: 'Community', icon: '🌐' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function sidebarLinkClass({ isActive }) {
  return isActive
    ? 'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-950 bg-ink-100 font-medium border-l-2 border-accent pl-[10px]'
    : 'flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-500 hover:text-ink-950 hover:bg-ink-100 transition-colors';
}

function bottomLinkClass({ isActive }) {
  return isActive
    ? 'flex flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium text-ink-950'
    : 'flex flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium text-ink-500';
}

export function AppShell() {
  const { streak } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hidden dedication: counts taps on the logo, reveals the note on the REVEAL_TAPS-th tap.
  const [taps, setTaps] = useState(0);
  const [showDedication, setShowDedication] = useState(false);

  // Mobile "More" sheet: exposes the overflow links that don't fit in the bottom bar.
  const [showMore, setShowMore] = useState(false);

  // Highlight the "More" button whenever the active route lives inside the sheet.
  const moreActive = MORE_LINKS.some((link) => location.pathname === link.to);

  function registerLogoTap() {
    setTaps((prev) => {
      const next = prev + 1;
      if (next >= REVEAL_TAPS) {
        setShowDedication(true);
        return 0;
      }
      return next;
    });
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div>
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-52 border-r border-ink-300 bg-white fixed top-0 left-0 h-screen flex-col">
        <div className="px-3 py-4">
          <button
            type="button"
            onClick={registerLogoTap}
            className="flex items-center gap-2 text-lg text-ink-950 font-semibold tracking-tight focus:outline-none"
            aria-label="Vaishu"
          >
            <img src="/pwa-icon.svg" alt="" aria-hidden="true" className="h-6 w-6 rounded-md" />
            Vaishu
          </button>
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
          {/* Quiet dedication — name accented, everything else muted (two-tone, elegant). */}
          <p className="mt-2 px-3 text-2xs text-ink-500">
            Made with <span aria-hidden="true">♥</span> for{' '}
            <span className="text-ink-950 font-medium">Vaishu</span>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-52 min-h-screen bg-ink-50 pb-16 md:pb-0">
        {/* Header with streak display shell */}
        <header className="h-14 border-b border-ink-300 bg-white flex items-center justify-between px-6">
          <button
            type="button"
            onClick={registerLogoTap}
            className="flex items-center gap-2 text-2xs text-ink-500 font-medium uppercase tracking-widest md:hidden focus:outline-none"
            aria-label="Vaishu"
          >
            <img src="/pwa-icon.svg" alt="" aria-hidden="true" className="h-5 w-5 rounded" />
            Vaishu
          </button>
          <StreakDisplay streak={streak} className="ml-auto" />
        </header>

        <main className="max-w-2xl mx-auto px-6 py-6">
          <InstallPrompt />
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-ink-300 flex">
        {MOBILE_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={bottomLinkClass}>
            <span aria-hidden="true" className="text-lg leading-none">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
        {/* "More" opens the overflow sheet so every feature is reachable in the PWA. */}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          aria-haspopup="dialog"
          aria-expanded={showMore}
          className={
            moreActive
              ? 'flex flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium text-ink-950 focus:outline-none'
              : 'flex flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium text-ink-500 focus:outline-none'
          }
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ⋯
          </span>
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet — overflow navigation for full PWA feature parity. */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
          onClick={() => setShowMore(false)}
          role="dialog"
          aria-modal="true"
          aria-label="More"
        >
          <div
            className="w-full bg-white rounded-t-md shadow-modal p-4 pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-1 pb-3 text-2xs text-ink-500 uppercase tracking-widest">More</p>
            <div className="grid grid-cols-4 gap-2">
              {MORE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    isActive
                      ? 'flex flex-col items-center justify-center gap-1 rounded py-3 text-2xs font-medium text-ink-950 bg-ink-100'
                      : 'flex flex-col items-center justify-center gap-1 rounded py-3 text-2xs font-medium text-ink-500 hover:bg-ink-100 transition-colors'
                  }
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowMore(false)}
              className="mt-4 w-full text-2xs text-ink-500 uppercase tracking-widest hover:text-ink-950 transition-colors focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hidden dedication, revealed by tapping the logo REVEAL_TAPS times. */}
      {showDedication && <Dedication onClose={() => setShowDedication(false)} />}
    </div>
  );
}
