import { Button } from './Button';

export function ErrorMessage({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700"
    >
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
