// Date helpers — all comparisons in IST (UTC+5:30), per schema.md / frontend.md.
// Dates are always "YYYY-MM-DD" strings; never locale-formatted strings.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Today's date in IST as "YYYY-MM-DD".
export function todayIST() {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return ist.toISOString().slice(0, 10);
}

// Yesterday's date in IST as "YYYY-MM-DD".
export function yesterdayIST() {
  const ist = new Date(Date.now() + IST_OFFSET_MS - DAY_MS);
  return ist.toISOString().slice(0, 10);
}

// Parse a "YYYY-MM-DD" string to a UTC-midnight Date. Calendar math only — the string is
// already an IST calendar date (from todayIST), so no further offset is applied here.
function parseUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ISO 8601 week string "yyyy-Www" (e.g. "2025-W30") for the given IST date.
// Canonical algorithm: the Thursday of the current week decides the ISO year; week 1 is the
// week containing 4 January. UTC-based, never locale-dependent.
export function isoWeekIST(dateStr = todayIST()) {
  const date = parseUTC(dateStr);
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // shift to the week's Thursday
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date - yearStart) / DAY_MS + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

// The 7 date strings (Monday..Sunday) of the ISO week containing the given IST date.
// Pure — used by useWeeklyDigest to gather the week's daily-affairs docs.
export function weekDatesIST(dateStr = todayIST()) {
  const date = parseUTC(dateStr);
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (dayNum - 1));
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    out.push(day.toISOString().slice(0, 10));
  }
  return out;
}
