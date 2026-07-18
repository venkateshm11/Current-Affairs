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
