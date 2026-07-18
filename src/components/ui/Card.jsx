export function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white border border-ink-300 rounded-md shadow-card p-4 ${className}`}
    >
      {children}
    </div>
  );
}
