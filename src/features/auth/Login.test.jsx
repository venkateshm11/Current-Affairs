import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Prevent real Firebase initialisation when AuthContext module loads.
vi.mock('../../lib/firebase', () => ({ auth: {}, db: {}, googleProvider: {} }));
vi.mock('../../lib/firestore', () => ({
  getUserDoc: vi.fn(),
  createUserDoc: vi.fn(),
}));

import { Login } from './Login';
import { AuthContext } from '../../context/AuthContext';

describe('Login', () => {
  it('shows a friendly error message on auth/wrong-password', async () => {
    const signInWithEmail = vi
      .fn()
      .mockRejectedValue({ code: 'auth/wrong-password' });

    render(
      <AuthContext.Provider value={{ signInWithEmail, signInWithGoogle: vi.fn() }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // The friendly message is shown...
    expect(
      await screen.findByText('Invalid email or password.'),
    ).toBeInTheDocument();
    // ...and the raw Firebase code is never surfaced.
    expect(screen.queryByText(/auth\/wrong-password/)).not.toBeInTheDocument();
    expect(signInWithEmail).toHaveBeenCalledWith('user@example.com', 'wrongpass');
  });
});
