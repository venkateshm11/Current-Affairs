// Centred empty screen with an optional call to action (DESIGN_SYSTEM.md).
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <p className="text-md text-ink-950 font-medium">{title}</p>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
