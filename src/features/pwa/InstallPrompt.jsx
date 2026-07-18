import { Button, Card } from '../../components/ui';
import { usePwaInstall } from '../../hooks/usePwaInstall';

// A quiet, dismissible install prompt. Renders nothing until the browser offers installation.
// No user data — purely a UI affordance around the native beforeinstallprompt event.
export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss, dismissed } = usePwaInstall();

  if (!canInstall || dismissed) return null;

  return (
    <Card className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-base text-ink-950 font-medium">Install Vaishu</p>
        <p className="text-xs text-ink-500 mt-0.5">
          Add the app to your home screen for quick daily access.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={promptInstall}>
          Install
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </Card>
  );
}
