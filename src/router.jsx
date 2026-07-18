import { createBrowserRouter } from 'react-router-dom';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { DailyFeed } from './features/daily/DailyFeed';
import { Bookmarks } from './features/bookmarks/Bookmarks';
import { Flashcards } from './features/flashcards/Flashcards';
import { Quiz } from './features/quiz/Quiz';
import { Dashboard } from './features/dashboard/Dashboard';
import { Archive } from './features/archive/Archive';
import { Search } from './features/search/Search';
import { MonthlyOverview } from './features/monthly/MonthlyOverview';
import { Settings } from './features/settings/Settings';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DailyFeed /> },
          { path: 'bookmarks', element: <Bookmarks /> },
          { path: 'flashcards', element: <Flashcards /> },
          { path: 'quiz', element: <Quiz /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'archive', element: <Archive /> },
          { path: 'search', element: <Search /> },
          { path: 'monthly', element: <MonthlyOverview /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
]);
