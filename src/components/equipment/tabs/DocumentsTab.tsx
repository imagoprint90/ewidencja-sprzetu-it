export function DocumentsTab() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
      <p className="font-medium text-foreground">Dokumenty i protokoły — dostępne od Etapu 4</p>
      <p className="mt-2">
        Po uruchomieniu generowania PDF pojawią się tu protokoły wydania, przekazania i zwrotu
        tego sprzętu, z możliwością pobrania oraz dołączenia podpisanego skanu. Dokumenty będą
        przechowywane w prywatnym magazynie plików Supabase, niedostępnym publicznie.
      </p>
    </div>
  );
}
