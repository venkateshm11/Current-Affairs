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
// Uses setDoc with merge (upsert): updateDoc throws if the users/{uid} profile doc
// does not yet exist, so an upsert guarantees the key saves regardless.
export async function setGeminiApiKey(uid, encryptedKey) {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { geminiApiKey: encryptedKey },
      { merge: true },
    );
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

// --- Phase 5: Dashboard, Archive, Search, Weekly Digest ---
// Every helper is users/{uid}-scoped — path built from the uid argument only, never a
// caller-supplied string, and never a collectionGroup/root query (no cross-user access).

// List all of the user's test results, oldest first (chronological for the score-trend chart).
export async function listTestResults(uid) {
  try {
    const q = query(
      collection(db, 'users', uid, 'testResults'),
      orderBy('takenAt', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    throw new FirestoreReadError('Failed to list test results', err);
  }
}

// List the dates the user has archived daily-affairs content for. Light payload
// ({ id, date, examType }) for the archive calendar — the full day is loaded on demand via
// getDailyAffairs. Only days that actually exist for this user are returned.
export async function listDailyAffairsDates(uid) {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'dailyAffairs'));
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, date: data.date, examType: data.examType };
    });
  } catch (err) {
    throw new FirestoreReadError('Failed to list archive dates', err);
  }
}

// Cross-day keyword search — CLIENT-SIDE ONLY. Loads all of THIS user's daily-affairs docs into
// memory and filters in JS. The keyword is used solely for the in-memory match: it is never placed
// in a Firestore query predicate, never sent to Gemini, never sent to any external service.
export async function searchDailyAffairs(uid, keyword) {
  const term = (keyword || '').trim().toLowerCase();
  if (!term) return [];
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'dailyAffairs'));
    const matches = [];
    for (const d of snap.docs) {
      const data = d.data();
      for (const category of data.categories || []) {
        for (const item of category.items || []) {
          const haystack = [item.title, item.detail, ...(item.tags || [])]
            .join(' ')
            .toLowerCase();
          if (haystack.includes(term)) {
            matches.push({
              sourceDate: data.date,
              examType: data.examType,
              category: category.name,
              item,
            });
          }
        }
      }
    }
    return matches;
  } catch (err) {
    throw new FirestoreReadError('Failed to search daily affairs', err);
  }
}

// Firestore document id for a weekly digest: "2025-W30_banking". Exact match only.
function weeklyDigestDocId(week, examType) {
  return `${week}_${examType}`;
}

// Cache read (cache-before-call): the weekly digest for week+examType, or null on a miss.
export async function getWeeklyDigest(uid, week, examType) {
  try {
    const ref = doc(db, 'users', uid, 'weeklyDigests', weeklyDigestDocId(week, examType));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    throw new FirestoreReadError('Failed to read weekly digest', err);
  }
}

// Cache write: store the validated weekly digest (setDoc — one doc per week+examType, never
// addDoc). Called only after validateWeeklyDigestResponse succeeds. generatedAt uses
// serverTimestamp() — never new Date()/Date.now().
export async function saveWeeklyDigest(uid, week, examType, digest) {
  try {
    const ref = doc(db, 'users', uid, 'weeklyDigests', weeklyDigestDocId(week, examType));
    await setDoc(ref, {
      week,
      examType,
      weekSummary: digest.weekSummary,
      keyTopics: digest.keyTopics,
      revisionPoints: digest.revisionPoints,
      generatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw new FirestoreWriteError('Failed to save weekly digest', err);
  }
}

// --- Phase 6: Monthly overview cache + FCM token ---
// Every helper is users/{uid}-scoped — path built from the uid argument only, never a
// caller-supplied string. Covered by the canonical {subcollection}/{docId} + users/{uid} rules.

// Firestore document id for a monthly overview: "2025-07_banking". Exact match only.
function monthlyDocId(month, examType) {
  return `${month}_${examType}`;
}

// Cache read (cache-before-call): the monthly overview for month+examType, or null on a miss.
export async function getMonthlyOverview(uid, month, examType) {
  try {
    const ref = doc(db, 'users', uid, 'monthlyOverview', monthlyDocId(month, examType));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    throw new FirestoreReadError('Failed to read monthly overview', err);
  }
}

// Cache write: store the validated monthly overview (setDoc — one doc per month+examType, never
// addDoc). Called only after validateMonthlyResponse succeeds. generatedAt uses
// serverTimestamp() — never new Date()/Date.now().
export async function saveMonthlyOverview(uid, month, examType, overview) {
  try {
    const ref = doc(db, 'users', uid, 'monthlyOverview', monthlyDocId(month, examType));
    await setDoc(ref, {
      month,
      examType,
      keyTopics: overview.keyTopics,
      revisionPoints: overview.revisionPoints,
      categorySummaries: overview.categorySummaries,
      totalDays: overview.totalDays,
      generatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw new FirestoreWriteError('Failed to save monthly overview', err);
  }
}

// Store the user's FCM web-push registration token on their profile doc (uid-scoped).
// The token is not PII and is only ever written under the caller's own uid.
export async function setFcmToken(uid, token) {
  try {
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });
  } catch (err) {
    throw new FirestoreWriteError('Failed to save notification token', err);
  }
}
