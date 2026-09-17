"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Form";
import type { Equipment } from "@/lib/types";
import { getCategoryName } from "@/lib/equipment-helpers";

export function LinkedEquipmentTab({ equipment }: { equipment: Equipment }) {
  const { equipment: all, equipmentLinks, categories, addEquipmentLink, removeEquipmentLink } =
    useStore();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  const links = equipmentLinks.filter(
    (l) => l.equipmentId === equipment.id || l.linkedEquipmentId === equipment.id
  );
  const linkedItems = links.map((l) => {
    const otherId = l.equipmentId === equipment.id ? l.linkedEquipmentId : l.equipmentId;
    return { link: l, item: all.find((e) => e.id === otherId) };
  });

  const candidates = all.filter(
    (e) => e.id !== equipment.id && !links.some((l) => l.equipmentId === e.id || l.linkedEquipmentId === e.id)
  );

  function handleAdd() {
    if (!selected) return;
    const result = addEquipmentLink(equipment.id, selected);
    if (!result.ok) {
      setError(result.error ?? "Nie udało się dodać powiązania.");
      return;
    }
    setError(null);
    setSelected("");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Powiąż ten sprzęt z innymi urządzeniami wchodzącymi w skład zestawu (np. stacja
        dokująca, monitor). Każde urządzenie zachowuje własny numer inwentarzowy i historię —
        samo powiązanie nie zmienia przydziałów. Przekazywanie zestawu jako całości będzie
        dostępne w Etapie 3.
      </p>

      {linkedItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
          Brak powiązanego sprzętu.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linkedItems.map(({ link, item }) =>
            item ? (
              <li
                key={link.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <Link href={`/sprzet/${item.id}`} className="font-medium text-primary hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {getCategoryName(categories, item.categoryId)} · {item.inventoryNumber}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => removeEquipmentLink(link.id)}>
                  Usuń powiązanie
                </Button>
              </li>
            ) : null
          )}
        </ul>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium">Dodaj powiązanie</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className={inputClass}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Wybierz sprzęt…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.inventoryNumber})
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={handleAdd} disabled={!selected}>
            Dodaj
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
