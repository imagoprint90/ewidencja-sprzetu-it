import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-muted">
        <Inbox size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-red-50 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-danger">Wystąpił błąd</p>
      <p className="text-sm text-danger/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-danger/30 px-3 py-1.5 text-sm font-medium text-danger hover:bg-red-100"
        >
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Wczytywanie danych…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-14 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
