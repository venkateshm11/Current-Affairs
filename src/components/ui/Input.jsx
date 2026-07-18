// Text/password input (DESIGN_SYSTEM.md). Settings passes type="password" so the
// API key is masked in the UI.
export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  id,
  className = '',
  ...rest
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`h-9 w-full px-3 text-sm text-ink-950 bg-white border border-ink-300 rounded placeholder:text-ink-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${className}`}
      {...rest}
    />
  );
}
