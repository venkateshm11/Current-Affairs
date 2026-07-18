// Horizontal tab strip — the one place full-radius pills are used (DESIGN_SYSTEM.md).
// Active tab: filled near-black pill, white text. Nothing else.
const ACTIVE =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-ink-950 text-white';
const INACTIVE =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-ink-100 text-ink-500 hover:text-ink-950 hover:bg-ink-200';

export function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={activeTab === tab.id ? ACTIVE : INACTIVE}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
