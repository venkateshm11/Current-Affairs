import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Typed error classes — callers catch these and map to UI states.
export class FirestoreReadError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'FirestoreReadError';
    this.cause = cause;
  }
}

export class FirestoreWriteError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'FirestoreWriteError';
    this.cause = cause;
  }
}

export class GeminiParseError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GeminiParseError';
    this.cause = cause;
  }
}

// Default user profile document (schema.md — users/{uid}).
// geminiApiKey stays empty until the user sets it (encrypted) in Phase 2.
function defaultUserDoc() {
  return {
    geminiApiKey: '',
    defaultExamType: 'all',
    streak: { current: 0, longest: 0, lastDate: null },
    createdAt: serverTimestamp(),
  };
}

// Read the user's profile document. Returns data object or null if it does not exist.
// The path is always built from the uid argument — never from a caller-supplied string.
export async function getUserDoc(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    throw new FirestoreReadError('Failed to read user document', err);
  }
}

// Create the user's profile document with default fields.
// createdAt is set via serverTimestamp() and never updated afterwards.
export async function createUserDoc(uid) {
  try {
    await setDoc(doc(db, 'users', uid), defaultUserDoc());
  } catch (err) {
    throw new FirestoreWriteError('Failed to create user document', err);
  }
}
