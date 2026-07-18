import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

// --- Phase 2: Daily affairs cache, API key, exam type, streak ---

// Firestore document id for a cached day: "2025-07-17_banking". Exact match only.
function dailyDocId(date, examType) {
  return `${date}_${examType}`;
}

// Cache read: return the cached daily-affairs doc for date+examType, or null.
// The path is built entirely from the uid argument — never a caller-supplied string.
export async function getDailyAffairs(uid, date, examType) {
  try {
    const ref = doc(db, 'users', uid, 'dailyAffairs', dailyDocId(date, examType));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    throw new FirestoreReadError('Failed to read daily affairs', err);
  }
}

// Cache write: overwrite (setDoc, never addDoc) the day's doc with validated categories.
// generatedAt uses serverTimestamp() — never new Date()/Date.now().
export async function saveDailyAffairs(uid, date, examType, categories) {
  try {
    const ref = doc(db, 'users', uid, 'dailyAffairs', dailyDocId(date, examType));
    await setDoc(ref, {
      date,
      examType,
      categories,
      generatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw new FirestoreWriteError('Failed to save daily affairs', err);
  }
}

// Store the already-encrypted Gemini API key. This helper never encrypts and never
// receives plaintext — encryption happens in the caller via crypto.encryptApiKey.
export async function setGeminiApiKey(uid, encryptedKey) {
  try {
    await updateDoc(doc(db, 'users', uid), { geminiApiKey: encryptedKey });
  } catch (err) {
    throw new FirestoreWriteError('Failed to save API key', err);
  }
}

// Persist the user's default exam type.
export async function updateDefaultExamType(uid, examType) {
  try {
    await updateDoc(doc(db, 'users', uid), { defaultExamType: examType });
  } catch (err) {
    throw new FirestoreWriteError('Failed to update exam type', err);
  }
}

// Write all three streak fields (current, longest, lastDate) in a single atomic update.
export async function updateStreak(uid, streak) {
  try {
    await updateDoc(doc(db, 'users', uid), { streak });
  } catch (err) {
    throw new FirestoreWriteError('Failed to update streak', err);
  }
}
