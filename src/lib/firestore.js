import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
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

// --- Phase 3: Bookmarks ---
// Path is always users/{uid}/bookmarks — built from the uid argument only, never a
// caller-supplied string. Already covered by the canonical {subcollection}/{docId} rule.

// Save a bookmark (fields copied by value from the daily item). savedAt uses
// serverTimestamp() — never new Date()/Date.now(). Returns the new document id.
export async function addBookmark(uid, bookmark) {
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'bookmarks'), {
      title: bookmark.title,
      detail: bookmark.detail,
      sourceDate: bookmark.sourceDate,
      examType: bookmark.examType,
      tags: bookmark.tags ?? [],
      importance: bookmark.importance,
      savedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    throw new FirestoreWriteError('Failed to add bookmark', err);
  }
}

// Delete a single bookmark by its document id.
export async function removeBookmark(uid, bookmarkId) {
  try {
    await deleteDoc(doc(db, 'users', uid, 'bookmarks', bookmarkId));
  } catch (err) {
    throw new FirestoreWriteError('Failed to remove bookmark', err);
  }
}

// List the user's bookmarks, newest first. Returns [{ id, ...data }].
export async function listBookmarks(uid) {
  try {
    const q = query(
      collection(db, 'users', uid, 'bookmarks'),
      orderBy('savedAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    throw new FirestoreReadError('Failed to list bookmarks', err);
  }
}

// --- Phase 4: MCQ cache + test results ---
// Path is always users/{uid}/... built from the uid argument only, never a caller string.

// Firestore document id for a cached MCQ pool: "2025-07-17_banking". Exact match only.
function mcqDocId(date, examType) {
  return `${date}_${examType}`;
}

// Cache read: return the cached MCQ pool for date+examType, or null on a miss.
// Checked BEFORE any Gemini MCQ call (golden-rule #4) — the caller never skips this.
export async function getMcqCache(uid, date, examType) {
  try {
    const ref = doc(db, 'users', uid, 'mcqCache', mcqDocId(date, examType));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    throw new FirestoreReadError('Failed to read MCQ cache', err);
  }
}

// Cache write: store the validated MCQ pool for the day (setDoc — one cache doc per
// date+examType, never addDoc). Only called after validateMcqResponse succeeds.
// generatedAt uses serverTimestamp() — never new Date()/Date.now().
export async function saveMcqCache(uid, date, examType, questions) {
  try {
    const ref = doc(db, 'users', uid, 'mcqCache', mcqDocId(date, examType));
    await setDoc(ref, {
      date,
      examType,
      questions,
      generatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw new FirestoreWriteError('Failed to save MCQ cache', err);
  }
}

// Save a completed test result. addDoc (never setDoc) — each result is a new document
// and never overwrites a prior one. All fields are computed client-side and passed in;
// takenAt uses serverTimestamp() — never new Date()/Date.now(). Returns the new id.
export async function saveTestResult(uid, result) {
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'testResults'), {
      date: result.date,
      examType: result.examType,
      mode: result.mode,
      score: result.score,
      totalQ: result.totalQ,
      correct: result.correct,
      wrong: result.wrong,
      skipped: result.skipped,
      timeTaken: result.timeTaken,
      negativeMarkingEnabled: result.negativeMarkingEnabled,
      categoryBreakdown: result.categoryBreakdown,
      takenAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    throw new FirestoreWriteError('Failed to save test result', err);
  }
}
