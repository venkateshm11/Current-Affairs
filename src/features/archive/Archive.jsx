import { useState } from 'react';
import { EmptyState, ErrorMessage, Spinner } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useArchive } from '../../hooks/useArchive';
import { ExamFilter } from '../daily/ExamFilter';
import { ArchiveDay } from './ArchiveDay';

// Calendar-style browser over the days the user has generated. Selecting a day opens the
// read-only ArchiveDay reader. The exam filter re-scopes which days are shown.
export function Archive() {
  const { examType } = useApp();
  const { dates, loading, error, refetch } = useArchive(examType);
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <ArchiveDay
        date={selected.date}
        examType={selected.examType}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-ink-950 font-semibold tracking-tight">Archive</h1>
      <ExamFilter />
      {renderBody()}
    </div>
  );

  function renderBody() {
    if (loading) {
      return (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <ErrorMessage message="Something went wrong. Please try again." onRetry={refetch} />
      );
    }

    if (!dates.length) {
      return (
        <EmptyState
          icon="🗄️"
          title="No content archived yet"
          description="Generate daily affairs to build your archive."
        />
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {dates.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setSelected({ date: entry.date, examType: entry.examType })}
            className="flex flex-col items-start gap-1 rounded-md border border-ink-300 bg-white p-3 text-left shadow-card hover:bg-ink-100 transition-colors"
          >
            <span className="font-mono text-xs text-ink-950">{entry.date}</span>
            <span className="text-2xs text-ink-500 uppercase tracking-widest">
              {entry.examType}
            </span>
          </button>
        ))}
      </div>
    );
  }
}
