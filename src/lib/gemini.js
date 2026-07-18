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

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
export async function callGemini(apiKey, prompt) {
  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
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
