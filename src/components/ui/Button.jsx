import { Spinner } from './Spinner';

const VARIANTS = {
  primary:
    'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] transition-all duration-100',
  secondary:
    'bg-white text-ink-950 border border-ink-300 hover:bg-ink-100 transition-colors',
  ghost: 'text-ink-500 hover:text-ink-950 hover:bg-ink-100 transition-colors',
  danger: 'bg-red-600 text-white hover:bg-red-700 transition-colors',
};

const SIZES = {
  sm: 'h-7 px-3 text-xs rounded',
  md: 'h-9 px-4 text-sm rounded',
  lg: 'h-11 px-5 text-md rounded-md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className = '',
}) {
  const isInactive = loading || disabled;
  const stateClass = loading
    ? 'opacity-50 cursor-not-allowed'
    : disabled
      ? 'opacity-40 cursor-not-allowed'
      : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isInactive}
      className={`inline-flex items-center justify-center gap-2 font-medium ${VARIANTS[variant]} ${SIZES[size]} ${stateClass} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
