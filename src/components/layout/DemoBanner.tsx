import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning sm:px-6 lg:px-8">
      <AlertTriangle size={16} className="shrink-0" />
      <p>
        <strong>Tryb demonstracyjny:</strong> dane fikcyjne, przechowywane wyłącznie w
        pamięci przeglądarki i utracone po odświeżeniu strony. To nie jest jeszcze
        połączenie z bazą danych firmy.
      </p>
    </div>
  );
}
