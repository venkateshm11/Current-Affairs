import { Tabs } from '../../components/ui';
import { useApp } from '../../context/AppContext';

// Canonical exam-type order (core.md / frontend.md).
const EXAM_TABS = [
  { id: 'all', label: 'All' },
  { id: 'banking', label: 'Banking' },
  { id: 'upsc', label: 'UPSC' },
  { id: 'ssc', label: 'SSC' },
  { id: 'defence', label: 'Defence' },
  { id: 'railway', label: 'Railway' },
];

// The exam-type filter. Changing it persists users/{uid}.defaultExamType (via AppContext)
// but never triggers a Gemini call on its own — generation is driven by the feed.
export function ExamFilter() {
  const { examType, setExamType } = useApp();
  return <Tabs tabs={EXAM_TABS} activeTab={examType} onTabChange={setExamType} />;
}
