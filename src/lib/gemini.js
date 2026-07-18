// Gemini integration — client-side, using the user's own API key.
// Contract (core.md / firebase.md / golden-rules.md):
//  - Deterministic JSON-only prompt, parse + validate the shape before use.
//  - The API key is a function parameter only — never a module-level variable, never logged.
//  - Cache-before-call is enforced by the caller (useDailyAffairs), not here.

import { GeminiParseError } from './firestore';

// HTTP / network failure talking to Gemini. Distinct from GeminiParseError (bad shape).
export class GeminiCallError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GeminiCallError';
    this.cause = cause;
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

// Resolved model id is cached for the session. It is a plain model name
// (e.g. "gemini-2.5-flash") — never the API key — so module-level caching is safe.
let cachedModel = null;

// Discover which models this key can actually use for generateContent, then pick the
// best per MODEL_PREFERENCES → any flash model → any model → FALLBACK_MODEL. Discovery is
// best-effort: on any failure it falls back so generation is never blocked by this step.
export async function resolveModel(apiKey) {
  if (MODEL_OVERRIDE) return MODEL_OVERRIDE;
  if (cachedModel) return cachedModel;

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
    // Network failure listing models — fall through to the fallback model.
  }

  // Skip non-text variants (image / tts / audio / vision / robotics / preview, etc.) so a
  // generic fallback never lands on a model that can't return plain-text JSON.
  const isTextFlash = (m) =>
    m.includes('flash') &&
    !/(image|tts|audio|vision|robotics|computer-use|omni|preview)/.test(m);

  const available = new Set(names);
  cachedModel =
    MODEL_PREFERENCES.find((m) => available.has(m)) ||
    names.find((m) => m.includes('flash') && m.includes('latest')) ||
    names.find(isTextFlash) ||
    names[0] ||
    FALLBACK_MODEL;
  return cachedModel;
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

// Call Gemini over HTTPS. apiKey is used only within this function scope.
// The model is resolved from the account's available models (see resolveModel).
export async function callGemini(apiKey, prompt) {
  const model = await resolveModel(apiKey);
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
    // Network-level failure — never surface the raw cause to the UI.
    throw new GeminiCallError('Gemini request failed', err);
  }

  if (!response.ok) {
    // A cached model that has since been retired returns 404 — drop it so the next
    // attempt rediscovers a live model instead of failing forever.
    if (response.status === 404) cachedModel = null;
    // Status only — never the response body (may echo the key or prompt).
    throw new GeminiCallError(`Gemini API error: ${response.status}`);
  }

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
