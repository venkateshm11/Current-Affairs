import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Prevent real Firebase initialisation when AuthContext module loads.
vi.mock('../../lib/firebase', () => ({ auth: {}, db: {}, googleProvider: {} }));
vi.mock('../../lib/firestore', () => ({
  getUserDoc: vi.fn(),
  createUserDoc: vi.fn(),
}));

import { ProtectedRoute } from './ProtectedRoute';
import { AuthContext } from '../../context/AuthContext';

function renderWithAuth(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>protected content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects an unauthenticated user to /login', () => {
    renderWithAuth({ user: null, loading: false });

    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders child content when the user is authenticated', () => {
    renderWithAuth({ user: { uid: 'abc123' }, loading: false });

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
