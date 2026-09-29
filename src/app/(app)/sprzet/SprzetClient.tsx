"use client";

import { Suspense, useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ColumnPicker } from "@/components/equipment/ColumnPicker";
import {
  EMPTY_EQUIPMENT_FILTERS,
  EquipmentFilters,
  type EquipmentFiltersState,
} from "@/components/equipment/EquipmentFilters";
import { EquipmentTable } from "@/components/equipment/EquipmentTable";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useIsAdmin, useCanEditEquipment, useCanTransferEquipment } from "@/lib/current-user-context";
import { EQUIPMENT_COLUMNS, type ColumnFormat, type EquipmentColumnKey, type EquipmentStatus } from "@/lib/types";
import {
  employeeFullName,
  getEffectiveCondition,
  NO_LOCATION_FILTER,
  NO_PROTOCOL_CONDITION,
} from "@/lib/equipment-helpers";
import { deleteEquipmentAction } from "@/lib/supabase/actions/equipment-actions";
import type {
  Assignment,
  Category,
  Employee,
  Equipment,
  EquipmentLink,
  InstalledSoftware,
  Location,
  LastProtocolInfo,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  SoftwareProduct,
} from "@/lib/types";

const DEFAULT_COLUMNS: EquipmentColumnKey[] = [
  "inventoryNumber",
  "category",
  "employee",
  "assignmentDates",
  "name",
  "manufacturer",
  "model",
  "serialNumber",
  "status",
  "protocolCondition",
  "windows",
  "location",
  "lastHolder",
  "lastProtocol",
  "invoice",
  "domain",
  "openvpn",
];

function SprzetPageInner({
  equipment,
  categories,
  employees,
  assignments,
  equipmentLinks,
  installedSoftware,
  softwareProducts,
  licenses,
  licenseAssignments,
  locations,
  lastProtocols,
}: {
  equipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
  installedSoftware: InstalledSoftware[];
  softwareProducts: SoftwareProduct[];
  licenses: SoftwareLicense[];
  licenseAssignments: SoftwareLicenseAssignment[];
  locations: Location[];
  lastProtocols: Record<string, LastProtocolInfo>;
}) {
  const isAdmin = useIsAdmin();
  const canEditEquipment = useCanEditEquipment();
  const canTransferEquipment = useCanTransferEquipment();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") as EquipmentStatus | null;

  const [storedFilters, setStoredFilters] = useLocalStorage<EquipmentFiltersState>(
    "sprzet-filtry",
    EMPTY_EQUIPMENT_FILTERS
  );
  // Link z pulpitu (np. ?status=w_naprawie) zawsze wygrywa z zapamiętanym filtrem statusu,
  // ale dopóki użytkownik czegoś nie zmieni, nie nadpisujemy tym zapisanych filtrów.
  const filters: EquipmentFiltersState = useMemo(
    () => (urlStatus ? { ...storedFilters, statuses: [urlStatus] } : storedFilters),
    [storedFilters, urlStatus]
  );
  const setFilters = setStoredFilters;

  // Lokalna kopia listy sprzętu: edycje pojedynczych pól, zmiana statusu i usuwanie aktualizują
  // ją bezpośrednio w przeglądarce (bez router.refresh()), więc nie trzeba za każdym razem od
  // nowa odpytywać serwera o wszystkie powiązane dane (kategorie, pracowników, licencje…) tylko
  // po to, żeby odświeżyć jedno pole jednego wiersza. Synchronizuje się z propsem przy
  // prawdziwym odświeżeniu strony (np. po dodaniu sprzętu gdzie indziej) — porównanie i
  // ewentualny setState dzieją się w trakcie renderu (nie w efekcie), więc React "wygasza"
  // zbędny dodatkowy przebieg zamiast go wykonywać po zamontowaniu.
  const [prevEquipment, setPrevEquipment] = useState(equipment);
  const [equipmentState, setEquipmentState] = useState(equipment);
  if (equipment !== prevEquipment) {
    setPrevEquipment(equipment);
    setEquipmentState(equipment);
  }

  function patchEquipmentLocally(id: string, patch: Partial<Equipment>) {
    setEquipmentState((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEquipmentLocally(ids: string[]) {
    const idSet = new Set(ids);
    setEquipmentState((prev) => prev.filter((e) => !idSet.has(e.id)));
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();
  const [visibleColumns, setVisibleColumns] = useLocalStorage<EquipmentColumnKey[]>(
    "sprzet-kolumny",
    DEFAULT_COLUMNS
  );
  const [showRowNumbers, setShowRowNumbers] = useLocalStorage<boolean>("sprzet-lp", true);
  const [columnColors, setColumnColors] = useLocalStorage<Partial<Record<EquipmentColumnKey, string>>>(
    "sprzet-kolory-kolumn",
    {}
  );
  const [columnFormats, setColumnFormats] = useLocalStorage<Partial<Record<EquipmentColumnKey, ColumnFormat>>>(
    "sprzet-formatowanie-kolumn",
    {}
  );
  const [columnWidths, setColumnWidths] = useLocalStorage<Partial<Record<EquipmentColumnKey, number>>>(
    "sprzet-szerokosc-kolumn",
    {}
  );

  const activeAssignmentByEquipment = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const a of assignments) if (a.returnedAt === null) map.set(a.equipmentId, a);
    return map;
  }, [assignments]);
  const windowsCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.supportsWindows).map((c) => c.id)),
    [categories]
  );
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  // Zbiór id produktów oprogramowania na sprzęcie — zarówno oznaczonych jako zainstalowane,
  // jak i przypisanych poprzez licencję "na urządzenie" — do filtra "Oprogramowanie".
  const softwareProductIdsByEquipment = useMemo(() => {
    const licenseProductId = new Map(licenses.map((l) => [l.id, l.productId]));
    const map = new Map<string, Set<string>>();
    const add = (equipmentId: string | null, productId: string | undefined) => {
      if (!equipmentId || !productId) return;
      let set = map.get(equipmentId);
      if (!set) map.set(equipmentId, (set = new Set()));
      set.add(productId);
    };
    for (const s of installedSoftware) add(s.equipmentId, s.softwareProductId);
    for (const a of licenseAssignments) add(a.equipmentId, licenseProductId.get(a.licenseId));
    return map;
  }, [installedSoftware, licenseAssignments, licenses]);
  // Zbiór id konkretnych licencji "na urządzenie" przypisanych do sprzętu — do osobnego
  // filtra "Licencja" (ten sam zestaw danych, co interaktywna kolumna Oprogramowanie).
  const licenseIdsByEquipment = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of licenseAssignments) {
      if (!a.equipmentId) continue;
      let set = map.get(a.equipmentId);
      if (!set) map.set(a.equipmentId, (set = new Set()));
      set.add(a.licenseId);
    }
    return map;
  }, [licenseAssignments]);

  // Wpisywanie w wyszukiwarkę nie blokuje pola — filtrowanie listy nadąża w tle.
  const deferredQuery = useDeferredValue(filters.query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return equipmentState.filter((item) => {
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(item.categoryId)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;
      if ((filters.domains ?? []).length > 0 && !filters.domains!.includes(item.inDomain ? "tak" : "nie"))
        return false;
      if ((filters.openvpns ?? []).length > 0 && !filters.openvpns!.includes(item.hasOpenvpn ? "tak" : "nie"))
        return false;
      if ((filters.conditions ?? []).length > 0) {
        const cond =
          getEffectiveCondition(item, lastProtocols[item.id]) ?? NO_PROTOCOL_CONDITION;
        if (!filters.conditions!.includes(cond)) return false;
      }
      if ((filters.windows ?? []).length > 0) {
        // Sprzęt spoza kategorii z Windows nie pasuje do żadnej opcji tego filtra.
        if (!windowsCategoryIds.has(item.categoryId)) return false;
        if (!filters.windows!.includes(item.windowsEdition ?? "brak")) return false;
      }
      if (filters.locationIds.length > 0 && !filters.locationIds.includes(item.locationId ?? NO_LOCATION_FILTER)) {
        return false;
      }
      if (filters.employeeIds.length > 0) {
        const active = activeAssignmentByEquipment.get(item.id);
        if (!active || !filters.employeeIds.includes(active.employeeId)) return false;
      }
      if ((filters.lastHolderIds ?? []).length > 0) {
        if (!item.lastHolderId || !filters.lastHolderIds!.includes(item.lastHolderId)) return false;
      }
      if ((filters.softwareProductIds ?? []).length > 0) {
        const productIds = softwareProductIdsByEquipment.get(item.id);
        if (!productIds || !filters.softwareProductIds!.some((id) => productIds.has(id))) return false;
      }
      if ((filters.licenseIds ?? []).length > 0) {
        const ids = licenseIdsByEquipment.get(item.id);
        if (!ids || !filters.licenseIds!.some((id) => ids.has(id))) return false;
      }
      if (q) {
        const active = activeAssignmentByEquipment.get(item.id);
        const activeEmployee = active ? employeeById.get(active.employeeId) : undefined;
        const employeeName = activeEmployee ? employeeFullName(activeEmployee) : "";
        const haystack = [item.name, item.serialNumber ?? "", item.inventoryNumber, employeeName]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    equipmentState,
    filters,
    deferredQuery,
    activeAssignmentByEquipment,
    employeeById,
    lastProtocols,
    windowsCategoryIds,
    softwareProductIdsByEquipment,
    licenseIdsByEquipment,
  ]);

  // Zaznaczenie jest pamiętane niezależnie od filtrów, ale do wyświetlania i akcji zbiorczych
  // liczą się tylko pozycje aktualnie widoczne na liście — unika to niejawnych operacji na
  // wierszach, których użytkownik już nie widzi.
  const visibleSelectedIds = useMemo(
    () => new Set(filtered.filter((item) => selectedIds.has(item.id)).map((item) => item.id)),
    [filtered, selectedIds]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => visibleSelectedIds.has(item.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of filtered) {
        if (allFilteredSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleBulkAssign() {
    const ids = Array.from(visibleSelectedIds);
    if (ids.length === 0) return;
    const [first, ...rest] = ids;
    const query = rest.length > 0 ? `?extra=${rest.join(",")}` : "";
    router.push(`/sprzet/${first}/przekaz${query}`);
  }

  function handleBulkDelete() {
    setBulkDeleteOpen(false);
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      let okCount = 0;
      const failedNames: string[] = [];
      const removedIds: string[] = [];
      for (const id of ids) {
        const result = await deleteEquipmentAction(id);
        if (result.ok) {
          okCount += 1;
          removedIds.push(id);
        } else {
          failedNames.push(equipmentState.find((e) => e.id === id)?.name ?? id);
        }
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      setBulkMessage(
        failedNames.length === 0
          ? `Usunięto ${okCount} pozycji.`
          : `Usunięto ${okCount} z ${ids.length}. Zablokowane przez powiązane protokoły: ${failedNames.join(", ")}.`
      );
      removeEquipmentLocally(removedIds);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Sprzęt</h1>
          <p className="text-sm text-muted">
            {filtered.length} z {equipmentState.length} pozycji
          </p>
        </div>
        {(isAdmin || canEditEquipment) && (
          <Link href="/sprzet/nowy">
            <Button>
              <Plus size={16} />
              Dodaj sprzęt
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <EquipmentFilters
          value={filters}
          onChange={setFilters}
          categories={categories}
          employees={employees}
          locations={locations}
          softwareProducts={softwareProducts}
          licenses={licenses}
        />
        <ColumnPicker
          visible={visibleColumns}
          onChange={setVisibleColumns}
          colors={columnColors}
          onColorsChange={setColumnColors}
          formats={columnFormats}
          onFormatsChange={setColumnFormats}
          showRowNumbers={showRowNumbers}
          onShowRowNumbersChange={setShowRowNumbers}
        />
      </div>

      {(isAdmin || canEditEquipment || canTransferEquipment) && visibleSelectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">Zaznaczono: {visibleSelectedIds.size}</span>
          <div className="flex flex-wrap gap-2">
            {(isAdmin || canTransferEquipment) && (
              <Button size="sm" variant="secondary" onClick={handleBulkAssign} disabled={isBulkPending}>
                Przydziel zaznaczone
              </Button>
            )}
            {(isAdmin || canEditEquipment) && (
              <Button size="sm" variant="ghost" onClick={() => setBulkDeleteOpen(true)} disabled={isBulkPending}>
                <Trash2 size={14} />
                Usuń zaznaczone
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearSelection} disabled={isBulkPending}>
              Anuluj zaznaczenie
            </Button>
          </div>
          {isBulkPending && <span className="text-xs text-muted">Przetwarzanie…</span>}
        </div>
      )}

      {bulkMessage && (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">{bulkMessage}</p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Brak sprzętu spełniającego kryteria"
          description="Zmień filtry wyszukiwania albo dodaj nowy sprzęt do ewidencji."
          action={
            isAdmin || canEditEquipment ? (
              <Link href="/sprzet/nowy">
                <Button variant="secondary">Dodaj pierwszy sprzęt</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <EquipmentTable
          equipment={filtered}
          categories={categories}
          employees={employees}
          assignments={assignments}
          links={equipmentLinks}
          installedSoftware={installedSoftware}
          softwareProducts={softwareProducts}
          licenses={licenses}
          licenseAssignments={licenseAssignments}
          locations={locations}
          lastProtocols={lastProtocols}
          visibleColumns={visibleColumns.length ? visibleColumns : EQUIPMENT_COLUMNS.slice(0, 3)}
          columnColors={columnColors}
          columnFormats={columnFormats}
          columnWidths={columnWidths}
          onColumnWidthsChange={setColumnWidths}
          showRowNumbers={showRowNumbers}
          selectedIds={visibleSelectedIds}
          allSelected={allFilteredSelected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onLocalPatch={patchEquipmentLocally}
          onLocalRemove={removeEquipmentLocally}
        />
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Usunąć ${visibleSelectedIds.size} pozycji?`}
        description="Tej operacji nie można cofnąć. Pozycje z powiązanymi protokołami zostaną pominięte — usuń najpierw ich protokoły."
        confirmLabel="Usuń zaznaczone"
        danger
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

export function SprzetClient(props: {
  equipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  equipmentLinks: EquipmentLink[];
  installedSoftware: InstalledSoftware[];
  softwareProducts: SoftwareProduct[];
  licenses: SoftwareLicense[];
  licenseAssignments: SoftwareLicenseAssignment[];
  locations: Location[];
  lastProtocols: Record<string, LastProtocolInfo>;
}) {
  return (
    <Suspense>
      <SprzetPageInner {...props} />
    </Suspense>
  );
}
