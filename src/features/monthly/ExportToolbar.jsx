import { useState } from 'react';
import { Button } from '../../components/ui';
import {
  copyOverviewAsText,
  exportElementToImage,
  exportElementToPdf,
} from '../../lib/export';

// Export controls for the monthly overview. Every action runs fully client-side (no upload).
// Exported content is only the overview data; filenames carry no user identifier.
export function ExportToolbar({ overview, month, examType, targetRef }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');

  async function run(kind, action) {
    setStatus('');
    setBusy(kind);
    try {
      await action();
      if (kind === 'text') setStatus('Copied to clipboard.');
    } catch {
      setStatus('Export failed. Please try again.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        loading={busy === 'text'}
        onClick={() => run('text', () => copyOverviewAsText(overview, month, examType))}
      >
        Copy text
      </Button>
      <Button
        variant="secondary"
        size="sm"
        loading={busy === 'pdf'}
        onClick={() => run('pdf', () => exportElementToPdf(targetRef.current, month))}
      >
        Download PDF
      </Button>
      <Button
        variant="secondary"
        size="sm"
        loading={busy === 'image'}
        onClick={() => run('image', () => exportElementToImage(targetRef.current, month))}
      >
        Save image
      </Button>
      {status && <span className="text-xs text-ink-500">{status}</span>}
    </div>
  );
}
