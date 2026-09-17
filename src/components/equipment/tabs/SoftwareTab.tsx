export function SoftwareTab() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
      <p className="font-medium text-foreground">Moduł oprogramowania — dostępny od Etapu 5</p>
      <p className="mt-2">
        Tutaj pojawi się lista oprogramowania zainstalowanego na tym sprzęcie oraz przypisanych
        licencji, wraz z informacją o liczbie wykorzystanych i wolnych stanowisk. Klucze
        aktywacyjne nie będą nigdzie wyświetlane.
      </p>
    </div>
  );
}
