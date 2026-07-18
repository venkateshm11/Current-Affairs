// Thin progress track — quiet ink track with a near-black fill (DESIGN_SYSTEM.md tokens).
// value is clamped to 0-100. variant reserved for future accents; default is the accent fill.
const FILLS = {
  default: 'bg-accent',
  success: 'bg-stripe-low',
  warning: 'bg-stripe-medium',
  danger: 'bg-stripe-high',
};

export function ProgressBar({ value = 0, variant = 'default', className = '' }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-100 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-200 ${FILLS[variant] || FILLS.default}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
