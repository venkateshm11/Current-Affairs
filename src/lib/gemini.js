// Gemini integration — client-side, using the user's own API key.
// Contract (core.md / firebase.md / golden-rules.md):
//  - Deterministic JSON-only prompt, parse + validate the shape before use.
//  - The API key is a function parameter only — never a module-level variable, never logged.
//  - Cache-before-call is enforced by the caller (useDailyAffairs), not here.

import { GeminiParseError } from './firestore';

// HTTP / network failure talking to Gemini. Distinct from GeminiParseError (bad shape).
// `status` is the HTTP status (null for network-level failures) — used to show a specific,
// actionable message. Only the status is kept, never the response body (may echo key/prompt).
export class GeminiCallError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message);
    this.name = 'GeminiCallError';
    this.status = status;
    this.cause = cause;
  }
}

// Map a Gemini failure to a specific, actionable message. Uses the HTTP status only —
// never the response body — so no API key or prompt text can leak into the UI.
export function geminiErrorMessage(error) {
  switch (error?.status ?? null) {
    case 400:
      return 'That API key looks invalid. Copy a fresh key from Google AI Studio (aistudio.google.com/apikey) and try again.';
    case 401:
    case 403:
      return 'That API key was rejected. Use a Google AI Studio (Gemini) key with the Generative Language API enabled and no key restrictions.';
    case 404:
      return 'None of the Gemini models available on this key could be reached. Try again, or use a different key.';
    case 429:
      return 'This key has hit its Gemini quota. Wait a while, or use a key with billing enabled.';
    case 500:
    case 503:
      return 'Gemini is temporarily unavailable. Please try again in a moment.';
    default:
      return 'AI service unavailable. Check your API key or try again.';
  }
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Optional hard override — set VITE_GEMINI_MODEL to pin a model and skip discovery.
const MODEL_OVERRIDE = import.meta.env.VITE_GEMINI_MODEL || null;

// Used only if discovery fails or the account exposes no usable model. The "-latest"
// alias is chosen because Google guarantees it points to a currently-serving model —
// a versioned id like gemini-2.5-flash can appear in ListModels yet still 404 on
// generateContent for a given key.
const FALLBACK_MODEL = 'gemini-flash-latest';

// Preference order among the account's available models — first match wins. Flash-class
// only: fastest and cheapest on quota, which suits once-a-day generation for two users.
// The "-latest" aliases come first: they reliably serve generateContent, whereas pinned
// versions (gemini-2.5-flash, gemini-2.0-flash) can be listed but 404 or 429 on call.
const MODEL_PREFERENCES = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

// Last model that successfully served generateContent this session. A plain model name
// (e.g. "gemini-2.5-flash") — never the API key — so module-level caching is safe. It is
// tried first on the next call, and cleared whenever it stops working so discovery reruns.
let cachedModel = null;

// Reset the remembered model — exposed for tests and for callers that switch keys.
export function resetModelCache() {
  cachedModel = null;
}

// Skip non-text variants (image / tts / audio / vision / robotics / preview, etc.) so a
// generic fallback never lands on a model that can't return plain-text JSON.
const isTextFlash = (m) =>
  m.includes('flash') &&
  !/(image|tts|audio|vision|robotics|computer-use|omni|preview)/.test(m);

// Discover every model this key can use for generateContent and return them ranked best
// first: preferred -latest aliases → any latest flash → any text flash → anything else the
// account exposes → FALLBACK_MODEL as a last resort. callGemini walks this list in order so
// a single unavailable/retired model never fails generation while another model still works.
// Discovery is best-effort: on any failure it falls back to sensible defaults.
export async function resolveModelCandidates(apiKey) {
  if (MODEL_OVERRIDE) return [MODEL_OVERRIDE];

  let names = [];
  try {
    const res = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      names = (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m) => (m.name || '').replace(/^models\//, ''));
    }
  } catch {
    // Network failure listing models — fall through to the defaults below.
  }

  const available = new Set(names);
  const ranked = [
    ...MODEL_PREFERENCES.filter((m) => available.has(m)), // preferred, in order
    ...names.filter((m) => m.includes('flash') && m.includes('latest')), // any latest flash
    ...names.filter(isTextFlash), // any other text flash
    ...names, // anything else the account can generate with
    FALLBACK_MODEL, // last resort if discovery returned nothing usable
  ];

  // De-duplicate while preserving order.
  const seen = new Set();
  const candidates = [];
  for (const m of ranked) {
    if (m && !seen.has(m)) {
      seen.add(m);
      candidates.push(m);
    }
  }
  return candidates;
}

const IMPORTANCE = ['high', 'medium', 'low'];

// Human labels for the exam type — used only inside the prompt text.
const EXAM_LABELS = {
  all: 'all major Indian competitive exams',
  banking: 'Banking (IBPS / SBI) exams',
  upsc: 'UPSC / IAS civil services',
  ssc: 'SSC exams',
  defence: 'Defence exams (NDA / CDS / AFCAT)',
  railway: 'Railway (RRB) exams',
};

// Build a deterministic, JSON-only prompt for a single day + exam type.
export function buildDailyPrompt(date, examType) {
  const label = EXAM_LABELS[examType] || EXAM_LABELS.all;
  return [
    `You are a current-affairs editor for Indian competitive exam aspirants.`,
    `Produce the most important current affairs for ${date} relevant to ${label}.`,
    ``,
    `Return ONLY valid JSON, no markdown fences and no prose, matching exactly this shape:`,
    `{`,
    `  "categories": [`,
    `    {`,
    `      "name": "Economy & Finance",`,
    `      "icon": "💰",`,
    `      "items": [`,
    `        {`,
    `          "title": "short headline",`,
    `          "detail": "2-3 sentence explanation",`,
    `          "importance": "high | medium | low",`,
    `          "tags": ["tag1", "tag2"]`,
    `        }`,
    `      ]`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules: importance must be one of "high", "medium", "low". Each item has at most 5 tags.`,
    `Group items into 4-6 sensible categories, each with at least one item. Output JSON only.`,
  ].join('\n');
}

// Statuses that are key-wide, not model-specific: trying another model cannot help, so we
// stop immediately rather than burning quota. 401/403 = key rejected or restricted; 429 = quota.
const KEY_LEVEL_STATUSES = new Set([401, 403, 429]);

// Call Gemini over HTTPS. apiKey is used only within this function scope.
// Walks the account's available models best-first (see resolveModelCandidates), trying the
// next one on any model-level failure (404 retired, 400 rejected, 5xx transient). It only
// gives up when a key-level error occurs (bad/quota'd key) or every model has been tried —
// so a single unavailable model never blocks generation while another model still works.
export async function callGemini(apiKey, prompt) {
  const candidates = await resolveModelCandidates(apiKey);
  // Try the model that worked last this session first, then the rest of the candidates.
  const ordered = cachedModel
    ? [cachedModel, ...candidates.filter((m) => m !== cachedModel)]
    : candidates;

  let lastError = null;
  for (const model of ordered) {
    let response;
    try {
      response = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
    } catch (err) {
      // Network-level failure — same for every model. Never surface the raw cause.
      throw new GeminiCallError('Gemini request failed', { cause: err });
    }

    if (response.ok) {
      cachedModel = model; // remember the working model for the rest of the session
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new GeminiParseError('Empty Gemini response');
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new GeminiParseError('Gemini response was not valid JSON', err);
      }
    }

    // Non-OK: drop this model as the cached choice so we don't keep reusing a dead one.
    if (cachedModel === model) cachedModel = null;

    // Key-level failure won't change across models — stop now. Status only, never the body.
    if (KEY_LEVEL_STATUSES.has(response.status)) {
      throw new GeminiCallError(`Gemini API error: ${response.status}`, {
        status: response.status,
      });
    }

    // Model-level failure — remember it and try the next candidate.
    lastError = new GeminiCallError(`Gemini API error: ${response.status}`, {
      status: response.status,
    });
  }

  // Every candidate model failed — surface the last status (404 if we somehow had none).
  throw lastError || new GeminiCallError('No usable Gemini model', { status: 404 });
}

// Lightweight liveness check for a key, used by Settings when saving. Hits ListModels (the
// same endpoint discovery uses) so a key that can't list models — invalid, restricted, or
// wrong API — is caught before it is ever stored. Returns { ok } and, on failure, the HTTP
// `status` for messaging, or `network:true` when the check itself couldn't reach Google
// (inconclusive, not invalid). Never returns or logs the key or any response body.
export async function validateApiKey(apiKey) {
  let res;
  try {
    res = await fetch(`${API_BASE}/models?key=${apiKey}`);
  } catch {
    return { ok: false, network: true };
  }
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status };
}

// Build a deterministic, JSON-only prompt for a pool of MCQs for a day + exam type.
// One pool of up to 50 questions is generated and cached per date+examType; every quiz
// mode slices the first N (casual 10, timed 10/20/30, exam 50) — Gemini is never called
// twice for the same date+examType (ADR-006, golden-rule #4).
export function buildMcqPrompt(date, examType) {
  const label = EXAM_LABELS[examType] || EXAM_LABELS.all;
  return [
    `You are a quiz setter for Indian competitive exam aspirants.`,
    `Create 50 multiple-choice current-affairs questions for ${date} relevant to ${label}.`,
    ``,
    `Return ONLY valid JSON, no markdown fences and no prose, matching exactly this shape:`,
    `{`,
    `  "questions": [`,
    `    {`,
    `      "question": "short question text",`,
    `      "options": ["option A", "option B", "option C", "option D"],`,
    `      "correctIndex": 0,`,
    `      "explanation": "1-2 sentence explanation, at most 300 characters",`,
    `      "category": "Economy & Finance"`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules: each question has exactly 4 options. correctIndex is an integer 0-3 indexing`,
    `the options array. Group questions across 4-6 sensible categories. Output JSON only.`,
  ].join('\n');
}

// Validate the MCQ response against the canonical schema (schema.md).
// Throws GeminiParseError on any deviation. Returns the validated object unchanged.
export function validateMcqResponse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new GeminiParseError('Response is not an object');
  }
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new GeminiParseError('Missing questions array');
  }

  for (const q of raw.questions) {
    if (!q || typeof q !== 'object') {
      throw new GeminiParseError('Invalid question');
    }
    if (typeof q.question !== 'string' || typeof q.explanation !== 'string') {
      throw new GeminiParseError('Question missing question or explanation');
    }
    if (typeof q.category !== 'string') {
      throw new GeminiParseError('Question missing category');
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new GeminiParseError('Question must have exactly 4 options');
    }
    if (!q.options.every((o) => typeof o === 'string')) {
      throw new GeminiParseError('Options must be strings');
    }
    if (
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex > 3
    ) {
      throw new GeminiParseError('correctIndex out of range');
    }
  }

  return raw;
}

// Validate the daily-affairs response against the canonical schema (schema.md).
// Throws GeminiParseError on any deviation. Returns the validated object unchanged.
export function validateDailyResponse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new GeminiParseError('Response is not an object');
  }
  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    throw new GeminiParseError('Missing categories array');
  }

  for (const category of raw.categories) {
    if (!category || typeof category !== 'object') {
      throw new GeminiParseError('Invalid category');
    }
    if (typeof category.name !== 'string' || typeof category.icon !== 'string') {
      throw new GeminiParseError('Category missing name or icon');
    }
    if (!Array.isArray(category.items) || category.items.length === 0) {
      throw new GeminiParseError('Category missing items');
    }

    for (const item of category.items) {
      if (!item || typeof item !== 'object') {
        throw new GeminiParseError('Invalid item');
      }
      if (typeof item.title !== 'string' || typeof item.detail !== 'string') {
        throw new GeminiParseError('Item missing title or detail');
      }
      if (!Array.isArray(item.tags)) {
        throw new GeminiParseError('Item missing tags');
      }
      if (!IMPORTANCE.includes(item.importance)) {
        throw new GeminiParseError('Item importance out of range');
      }
    }
  }

  return raw;
}

// Build a deterministic, JSON-only prompt for a weekly digest. weekContent is the week's
// already-fetched daily-affairs data (array of daily docs) passed AS A DATA ARGUMENT — this
// function performs no Firestore read and no fetch, and never references the API key.
export function buildWeeklyDigestPrompt(week, examType, weekContent) {
  const label = EXAM_LABELS[examType] || EXAM_LABELS.all;
  const lines = [];
  for (const day of weekContent || []) {
    for (const category of day.categories || []) {
      for (const item of category.items || []) {
        lines.push(`- (${day.date}) ${item.title}: ${item.detail}`);
      }
    }
  }
  const corpus = lines.join('\n') || '(no items)';
  return [
    `You are a revision editor for Indian competitive exam aspirants.`,
    `Summarise the current affairs of ISO week ${week} relevant to ${label}.`,
    `Base your summary ONLY on the items below:`,
    ``,
    corpus,
    ``,
    `Return ONLY valid JSON, no markdown fences and no prose, matching exactly this shape:`,
    `{`,
    `  "weekSummary": "one concise paragraph summarising the week",`,
    `  "keyTopics": ["topic 1", "topic 2"],`,
    `  "revisionPoints": ["point 1", "point 2"]`,
    `}`,
    ``,
    `Rules: weekSummary is a non-empty string. keyTopics has at least 5 entries.`,
    `revisionPoints has at least 10 entries. All array entries are strings. Output JSON only.`,
  ].join('\n');
}

// Validate the weekly-digest response against the Phase 5 shape. Throws GeminiParseError on any
// deviation; returns raw unchanged on success. No Firestore write happens if this throws.
export function validateWeeklyDigestResponse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new GeminiParseError('Response is not an object');
  }
  if (typeof raw.weekSummary !== 'string' || raw.weekSummary.trim().length === 0) {
    throw new GeminiParseError('Missing weekSummary');
  }
  if (!Array.isArray(raw.keyTopics) || raw.keyTopics.length < 5) {
    throw new GeminiParseError('keyTopics must have at least 5 items');
  }
  if (!raw.keyTopics.every((t) => typeof t === 'string')) {
    throw new GeminiParseError('keyTopics must be strings');
  }
  if (!Array.isArray(raw.revisionPoints) || raw.revisionPoints.length < 10) {
    throw new GeminiParseError('revisionPoints must have at least 10 items');
  }
  if (!raw.revisionPoints.every((p) => typeof p === 'string')) {
    throw new GeminiParseError('revisionPoints must be strings');
  }
  return raw;
}

// Build a deterministic, JSON-only prompt for a monthly overview. monthContent is the month's
// already-fetched daily-affairs data (array of daily docs) passed AS A DATA ARGUMENT — this
// function performs no Firestore read and no fetch, and never references the API key.
export function buildMonthlyPrompt(month, examType, monthContent) {
  const label = EXAM_LABELS[examType] || EXAM_LABELS.all;
  const lines = [];
  for (const day of monthContent || []) {
    for (const category of day.categories || []) {
      for (const item of category.items || []) {
        lines.push(`- (${day.date}) [${category.name}] ${item.title}: ${item.detail}`);
      }
    }
  }
  const corpus = lines.join('\n') || '(no items)';
  return [
    `You are a revision editor for Indian competitive exam aspirants.`,
    `Produce a full monthly revision overview for ${month} relevant to ${label}.`,
    `Base your overview ONLY on the items below:`,
    ``,
    corpus,
    ``,
    `Return ONLY valid JSON, no markdown fences and no prose, matching exactly this shape:`,
    `{`,
    `  "keyTopics": ["topic 1", "topic 2"],`,
    `  "revisionPoints": ["point 1", "point 2"],`,
    `  "categorySummaries": { "Economy & Finance": "one paragraph summary" },`,
    `  "totalDays": 30`,
    `}`,
    ``,
    `Rules: keyTopics has between 10 and 30 entries. revisionPoints has at least 50 entries.`,
    `categorySummaries has one paragraph string per category covered. totalDays is the number of`,
    `distinct days summarised. All array entries are strings. Output JSON only.`,
  ].join('\n');
}

// Validate the monthly-overview response against the canonical schema (schema.md).
// Throws GeminiParseError on any deviation; returns raw unchanged on success. No Firestore write
// happens if this throws (the caller order guarantees it).
export function validateMonthlyResponse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new GeminiParseError('Response is not an object');
  }
  if (
    !Array.isArray(raw.keyTopics) ||
    raw.keyTopics.length < 10 ||
    raw.keyTopics.length > 30
  ) {
    throw new GeminiParseError('keyTopics must have between 10 and 30 items');
  }
  if (!raw.keyTopics.every((t) => typeof t === 'string')) {
    throw new GeminiParseError('keyTopics must be strings');
  }
  if (!Array.isArray(raw.revisionPoints) || raw.revisionPoints.length < 50) {
    throw new GeminiParseError('revisionPoints must have at least 50 items');
  }
  if (!raw.revisionPoints.every((p) => typeof p === 'string')) {
    throw new GeminiParseError('revisionPoints must be strings');
  }
  if (
    !raw.categorySummaries ||
    typeof raw.categorySummaries !== 'object' ||
    Array.isArray(raw.categorySummaries)
  ) {
    throw new GeminiParseError('categorySummaries must be an object');
  }
  const summaries = Object.values(raw.categorySummaries);
  if (summaries.length === 0 || !summaries.every((s) => typeof s === 'string')) {
    throw new GeminiParseError('categorySummaries values must be non-empty strings');
  }
  if (!Number.isInteger(raw.totalDays) || raw.totalDays < 0) {
    throw new GeminiParseError('totalDays must be a non-negative integer');
  }
  return raw;
}
