import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  monthlyExportFilename,
  overviewToPlainText,
  copyOverviewAsText,
} from './export';

const OVERVIEW = {
  keyTopics: ['Monetary policy', 'Union budget'],
  revisionPoints: ['RBI held the repo rate at 6.5%.'],
  categorySummaries: { 'Economy & Finance': 'A steady month for the economy.' },
  totalDays: 30,
};

describe('monthlyExportFilename', () => {
  it('builds a filename with no user identifier', () => {
    expect(monthlyExportFilename('2025-07', 'pdf')).toBe('2025-07_current-affairs.pdf');
    expect(monthlyExportFilename('2025-07', 'png')).toBe('2025-07_current-affairs.png');
    const name = monthlyExportFilename('2025-07', 'pdf');
    expect(name).not.toMatch(/uid|@/i);
  });
});

describe('overviewToPlainText', () => {
  it('includes the month, a key topic and a revision point, and no secrets', () => {
    const text = overviewToPlainText(OVERVIEW, '2025-07', 'banking');
    expect(text).toContain('2025-07');
    expect(text).toContain('Monetary policy');
    expect(text).toContain('RBI held the repo rate at 6.5%.');
    expect(text).not.toMatch(/apiKey|token/i);
  });
});

describe('copyOverviewAsText', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the plain-text overview to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await copyOverviewAsText(OVERVIEW, '2025-07', 'banking');

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Monetary policy');
    vi.unstubAllGlobals();
  });
});
