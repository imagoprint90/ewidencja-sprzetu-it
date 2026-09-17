import { formatDateTime } from "@/lib/format";
import type { Equipment } from "@/lib/types";

export function HistoryTab({ equipment }: { equipment: Equipment }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Baza danych zapisuje już każdą zmianę tego rekordu (kto, kiedy, co) w dzienniku
        zdarzeń. Czytelny podgląd tego dziennika w tym miejscu pojawi się w kolejnym etapie.
        Poniżej podstawowe znaczniki czasu dostępne już teraz.
      </p>
      <ul className="flex flex-col gap-2">
        <li className="rounded-xl border border-border bg-surface p-4 text-sm">
          <span className="font-medium">Utworzono kartę sprzętu</span>
          <span className="ml-2 text-muted">{formatDateTime(equipment.createdAt)}</span>
        </li>
        <li className="rounded-xl border border-border bg-surface p-4 text-sm">
          <span className="font-medium">Ostatnia aktualizacja</span>
          <span className="ml-2 text-muted">{formatDateTime(equipment.updatedAt)}</span>
        </li>
      </ul>
    </div>
  );
}
