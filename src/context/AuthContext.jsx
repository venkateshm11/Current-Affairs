import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getUserDoc, createUserDoc } from '../lib/firestore';

export const AuthContext = createContext(null);

// Ensure a users/{uid} profile document exists after a successful sign-in.
// Created once on first login; never updated here afterwards.
async function ensureUserDoc(uid) {
  const existing = await getUserDoc(uid);
  if (!existing) {
    await createUserDoc(uid);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth state is read only from Firebase's onAuthStateChanged — never from localStorage.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await ensureUserDoc(firebaseUser.uid);
        } catch {
          // Best-effort on session resume; the doc normally already exists.
          // Never log the error — it may reference uid/user data.
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // These only authenticate. The users/{uid} profile document is ensured by the
  // onAuthStateChanged listener above (which awaits ensureUserDoc before setUser),
  // so it is guaranteed before the app renders. We deliberately do NOT ensure the
  // doc here: a Firestore hiccup must never turn a successful sign-in into a
  // surfaced auth error — those errors carry no auth/* code and would map to the
  // generic "Something went wrong." message.
  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function registerWithEmail(email, password) {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      signOut,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
