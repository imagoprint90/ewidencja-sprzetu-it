import { AppWindow } from "lucide-react";

export default function OprogramowaniePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Oprogramowanie</h1>
        <p className="text-sm text-muted">Katalog produktów i licencji oprogramowania.</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-muted">
          <AppWindow size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold">Moduł zostanie uruchomiony w Etapie 5</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            Znajdzie się tu osobny katalog produktów oprogramowania i rejestr licencji (na
            urządzenie / na użytkownika), z limitem stanowisk i przypisaniami do sprzętu lub
            pracowników. Klucze aktywacyjne nie będą przechowywane ani wyświetlane.
          </p>
        </div>
      </div>
    </div>
  );
}
