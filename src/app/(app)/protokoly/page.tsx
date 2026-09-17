import { FileText } from "lucide-react";

export default function ProtokolyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Protokoły</h1>
        <p className="text-sm text-muted">Protokoły wydania, przekazania i zwrotu sprzętu.</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-muted">
          <FileText size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold">Moduł zostanie uruchomiony w Etapie 4</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            Po zatwierdzeniu operacji „Przekaż sprzęt” lub zwrotu do magazynu system będzie
            automatycznie generował dokument PDF (A4, z polskimi znakami i miejscami na podpis)
            i zapisywał go w prywatnym magazynie dokumentów. Tutaj pojawi się pełna lista
            wystawionych protokołów z możliwością ponownego pobrania.
          </p>
        </div>
      </div>
    </div>
  );
}
