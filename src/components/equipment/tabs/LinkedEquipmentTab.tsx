"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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

  // Komputery są zwykle "głównym" sprzętem zestawu, a dołączamy do niego akcesoria — ich
  // lista wyboru jest bez kategorii Komputery, żeby łatwiej było znaleźć właściwe urządzenie.
  const computerCategoryIds = new Set(
    categories.filter((c) => c.name.trim().toLowerCase() === "komputery").map((c) => c.id)
  );
  // Sprzęt już powiązany z jakimkolwiek innym urządzeniem (także z tym) nie jest proponowany —
  // pod listą pokazujemy tylko, ile pozycji z tego powodu ukryto.
  const linkedElsewhereIds = new Set(equipmentLinks.flatMap((l) => [l.equipmentId, l.linkedEquipmentId]));
  const baseCandidates = allEquipment.filter((e) => e.id !== equipment.id && !computerCategoryIds.has(e.categoryId));
  const candidates = baseCandidates.filter((e) => !linkedElsewhereIds.has(e.id));
  const hiddenLinkedCount = baseCandidates.length - candidates.length;

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
        samo powiązanie nie zmienia przydziałów. Zestaw jako całość przekażesz z poziomu
        zakładki „Przydziały” → „Przekaż sprzęt”.
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
            <div className="flex-1">
              <SearchableSelect
                options={candidates.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.inventoryNumber})`,
                  hint: getCategoryName(categories, c.categoryId),
                }))}
                value={selected}
                onChange={setSelected}
                placeholder="Wybierz sprzęt…"
                searchPlaceholder="Szukaj sprzętu: nazwa, nr inwentarzowy…"
              />
            </div>
            <Button variant="secondary" onClick={handleAdd} disabled={!selected || isPending}>
              Dodaj
            </Button>
          </div>
          {hiddenLinkedCount > 0 && (
            <p className="mt-2 text-xs text-muted">
              Nie pokazujemy {hiddenLinkedCount} urządzeń, które są już powiązane z innym sprzętem.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
