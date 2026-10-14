"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type UrlResult = { ok: true; data: { url: string } } | { ok: false; error: string };

export function isPreviewable(contentType: string, fileName: string): "pdf" | "image" | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (contentType === "application/pdf" || ext === "pdf") return "pdf";
  if (contentType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  return null;
}

// Szybki podgląd pliku w oknie. Plik pobieramy do pamięci i pokazujemy przez blob: — odpowiedź
// Storage ma nagłówki (sandbox) blokujące osadzanie PDF w ramce, a blob z naszej domeny nie ma
// tego problemu. Montuj komponent tylko, gdy podgląd jest otwarty (patrz użycie) — dzięki temu
// stan ładowania jest zawsze świeży dla każdego pliku.
export function FilePreviewDialog({
  fileName,
  contentType,
  loadUrl,
  onClose,
}: {
  fileName: string;
  contentType: string;
  loadUrl: () => Promise<UrlResult>;
  onClose: () => void;
}) {
  const kind = isPreviewable(contentType, fileName);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let createdUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const result = await loadUrl();
        if (!result.ok) throw new Error(result.error);
        const response = await fetch(result.data.url);
        if (!response.ok) throw new Error("Nie udało się pobrać pliku.");
        const blob = await response.blob();
        createdUrl = URL.createObjectURL(new Blob([blob], { type: contentType }));
        if (!cancelled) setBlobUrl(createdUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Nie udało się wczytać podglądu.");
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
    // loadUrl jest tworzone przy każdym renderze rodzica — podgląd ma załadować plik raz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="truncate text-sm font-medium" title={fileName}>
            {fileName}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {blobUrl && (
              <a
                href={blobUrl}
                download={fileName}
                title="Pobierz"
                className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-foreground"
              >
                <Download size={16} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Zamknij"
              className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/5">
          {error ? (
            <p className="px-6 text-center text-sm text-danger">{error}</p>
          ) : !blobUrl ? (
            <p className="text-sm text-muted">Wczytywanie podglądu…</p>
          ) : kind === "pdf" ? (
            <iframe src={blobUrl} title={fileName} className="h-full w-full border-0" />
          ) : kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blobUrl} alt={fileName} className="max-h-full max-w-full object-contain" />
          ) : (
            <p className="px-6 text-center text-sm text-muted">
              Podgląd tego typu pliku nie jest dostępny — użyj przycisku pobierania u góry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
