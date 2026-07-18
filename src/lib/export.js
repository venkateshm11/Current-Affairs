// Client-side export of the monthly overview — text, PDF, and image.
//
// Contract (phase-6.md):
//  - Everything runs client-side. Nothing is uploaded to any external server.
//  - html2pdf.js / html2canvas are loaded via dynamic import so they stay out of the main bundle.
//  - Exported content is ONLY the user's own monthly-overview data — never a key, token, or uid.
//  - The filename is "{YYYY-MM}_current-affairs.{ext}" — no uid, email, or full name.

const EXAM_LABELS = {
  all: 'All Exams',
  banking: 'Banking (IBPS)',
  upsc: 'UPSC / IAS',
  ssc: 'SSC',
  defence: 'Defence',
  railway: 'Railway',
};

// Filename for an exported file. Deliberately contains no user identifier.
export function monthlyExportFilename(month, ext) {
  return `${month}_current-affairs.${ext}`;
}

// Render the overview to a plain-text block. Pure — only overview fields are read.
export function overviewToPlainText(overview, month, examType) {
  const label = EXAM_LABELS[examType] || EXAM_LABELS.all;
  const lines = [`Monthly Current Affairs — ${month} (${label})`, ''];

  lines.push('KEY TOPICS');
  for (const topic of overview.keyTopics || []) {
    lines.push(`- ${topic}`);
  }
  lines.push('');

  lines.push('REVISION POINTS');
  for (const point of overview.revisionPoints || []) {
    lines.push(`- ${point}`);
  }
  lines.push('');

  lines.push('CATEGORY SUMMARIES');
  for (const [name, summary] of Object.entries(overview.categorySummaries || {})) {
    lines.push(`${name}: ${summary}`);
  }

  return lines.join('\n');
}

// Copy the overview to the clipboard as plain text. Client-side only.
export async function copyOverviewAsText(overview, month, examType) {
  const text = overviewToPlainText(overview, month, examType);
  await navigator.clipboard.writeText(text);
}

// Download the given DOM element as a PDF. Loads html2pdf.js on demand; renders fully
// client-side (no server upload). Filename has no user identifier.
export async function exportElementToPdf(element, month) {
  if (!element) return;
  const mod = await import('html2pdf.js');
  const html2pdf = mod.default || mod;
  await html2pdf()
    .set({
      filename: monthlyExportFilename(month, 'pdf'),
      margin: 10,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save();
}

// Save the given DOM element as a PNG image. Loads html2canvas on demand; renders fully
// client-side (no server upload). Filename has no user identifier.
export async function exportElementToImage(element, month) {
  if (!element) return;
  const mod = await import('html2canvas');
  const html2canvas = mod.default || mod;
  const canvas = await html2canvas(element, { useCORS: false });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = monthlyExportFilename(month, 'png');
  anchor.click();
  URL.revokeObjectURL(url);
}
