"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Form";
import type { Category, Equipment, EquipmentLink } from "@/lib/types";
import { getCategoryName } from "@/lib/equipment-helpers";
import { useIsAdmin } from "@/lib/current-user-context";
import {
  addEquipmentLinkAction,
  removeEquipmentLinkAction,
} from "@/lib/supabase/actions/equipment-actions";

export function LinkedEquipmentTab({
  equipment,
  allEquipment,
  categories,
  equipmentLinks,
}: {
  equipment: Equipment;
  allEquipment: Equipment[];
  categories: Category[];
  equipmentLinks: EquipmentLink[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  const links = equipmentLinks.filter(
    (l) => l.equipmentId === equipment.id || l.linkedEquipmentId === equipment.id
  );
  const linkedItems = links.map((l) => {
    const otherId = l.equipmentId === equipment.id ? l.linkedEquipmentId : l.equipmentId;
    return { link: l, item: allEquipment.find((e) => e.id === otherId) };
  });

  const candidates = allEquipment.filter(
    (e) => e.id !== equipment.id && !links.some((l) => l.equipmentId === e.id || l.linkedEquipmentId === e.id)
  );

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addEquipmentLinkAction(equipment.id, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setSelected("");
      router.refresh();
    });
  }

  function handleRemove(linkId: string) {
    startTransition(async () => {
      await removeEquipmentLinkAction(linkId, equipment.id);
      router.refresh();
    });
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
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleRemove(link.id)}
                  >
                    Usuń powiązanie
                  </Button>
                )}
              </li>
            ) : null
          )}
        </ul>
      )}

      {isAdmin && (
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
            <Button variant="secondary" onClick={handleAdd} disabled={!selected || isPending}>
              Dodaj
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
