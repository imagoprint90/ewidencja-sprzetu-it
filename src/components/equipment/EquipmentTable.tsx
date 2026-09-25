"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRightLeft, FileText, Pencil, Receipt, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type {
  Assignment,
  Category,
  Employee,
  Equipment,
  EquipmentColumnKey,
  EquipmentLink,
  InstalledSoftware,
  Location,
  LastProtocolInfo,
  EquipmentStatusDef,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  SoftwareProduct,
} from "@/lib/types";
import { EQUIPMENT_COLUMN_LABELS } from "@/lib/types";
import { getEffectiveCondition } from "@/lib/equipment-helpers";
import { useStatusLookup, useStatuses } from "@/lib/statuses-context";
import { StatusBadge } from "@/components/ui/Badge";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { EditableCell } from "@/components/ui/EditableCell";
import { SortableTh } from "@/components/ui/SortableTh";
import { formatDate } from "@/lib/format";
import { useSort } from "@/lib/useSort";
import { adaptColorForTheme, useIsDark } from "@/lib/useTheme";
import { applySort, compareNumbers, compareStrings } from "@/lib/sort";
import {
  employeeFullName,
  equipmentToInput,
} from "@/lib/equipment-helpers";
import {
  useCanEditEquipment,
  useCanTransferEquipment,
  useCurrentUser,
  useIsAdmin,
} from "@/lib/current-user-context";
import {
  deleteEquipmentAction,
  getEquipmentInvoiceDownloadUrlAction,
  updateEquipmentAction,
  updateEquipmentStatusAction,
  type EquipmentInput,
} from "@/lib/supabase/actions/equipment-actions";
import { getProtocolDownloadUrlAction } from "@/lib/supabase/actions/protocol-actions";

export function EquipmentTable({
  equipment,
  categories,
  employees,
  assignments,
  links,
  installedSoftware,
  softwareProducts,
  licenses,
  licenseAssignments,
  locations,
  lastProtocols,
  visibleColumns,
  columnColors,
  selectedIds,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
}: {
  equipment: Equipment[];
  categories: Category[];
  employees: Employee[];
  assignments: Assignment[];
  links: EquipmentLink[];
  installedSoftware: InstalledSoftware[];
  softwareProducts: SoftwareProduct[];
  licenses: SoftwareLicense[];
  licenseAssignments: SoftwareLicenseAssignment[];
  locations: Location[];
  lastProtocols: Record<string, LastProtocolInfo>;
  visibleColumns: EquipmentColumnKey[];
  columnColors: Partial<Record<EquipmentColumnKey, string>>;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const router = useRouter();
  const isDark = useIsDark();
  const statusLookup = useStatusLookup();
  const statusList = useStatuses();
  const isAdmin = useIsAdmin();
  const canEditEquipment = useCanEditEquipment();
  const canTransferEquipment = useCanTransferEquipment();
  const { visibleCategories } = useCurrentUser();
  // Konto z ograniczeniem kategorii widzi w dropdownie kategorii tylko te, do których ma
  // dostęp — inaczej mógłby próbować przenieść sprzęt do kategorii spoza swojego zakresu
  // (RLS by to i tak zablokowała, ale lepiej nie proponować wyboru, który się nie zapisze).
  const editableCategories =
    !isAdmin && canEditEquipment
      ? categories.filter((c) => (visibleCategories ?? []).includes(c.id))
      : categories;
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { sortKey, sortDir, toggleSort } = useSort<EquipmentColumnKey>(null, "asc", "sprzet-sortowanie");

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startDeleteTransition(async () => {
      const result = await deleteEquipmentAction(target.id);
      setDeleteTarget(null);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setDeleteError(null);
      router.refresh();
    });
  }

  async function saveField(item: Equipment, patch: Partial<EquipmentInput>) {
    const payload: EquipmentInput = { ...equipmentToInput(item), ...patch };
    const result = await updateEquipmentAction(item.id, payload);
    if (result.ok) router.refresh();
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  async function saveStatus(item: Equipment, status: string) {
    const result = await updateEquipmentStatusAction(item.id, status as Equipment["status"]);
    if (result.ok) router.refresh();
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  async function handleOpenProtocol(e: React.MouseEvent, protocol: LastProtocolInfo) {
    e.stopPropagation();
    if (!protocol.pdfPath) return;
    const result = await getProtocolDownloadUrlAction(protocol.pdfPath);
    if (result.ok) window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  async function handleOpenInvoice(e: React.MouseEvent, path: string) {
    e.stopPropagation();
    const result = await getEquipmentInvoiceDownloadUrlAction(path);
    if (result.ok) window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  const rows = useMemo(() => {
    // Słowniki zamiast wyszukiwania w tablicach dla każdego wiersza — lista jest tak
    // szybka, jak liczba pozycji, a nie jej kwadrat.
    const employeeById = new Map(employees.map((e) => [e.id, e]));
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
    const locationNameById = new Map(locations.map((l) => [l.id, l.name]));
    const productNameById = new Map(softwareProducts.map((p) => [p.id, p.name]));
    const licenseProductId = new Map(licenses.map((l) => [l.id, l.productId]));
    const equipmentById = new Map(equipment.map((e) => [e.id, e]));

    const activeByEquipment = new Map<string, Assignment>();
    for (const a of assignments) if (a.returnedAt === null) activeByEquipment.set(a.equipmentId, a);

    const softwareByEquipment = new Map<string, Set<string>>();
    const addSoftware = (equipmentId: string | null, productId: string | undefined) => {
      if (!equipmentId || !productId) return;
      const name = productNameById.get(productId);
      if (!name) return;
      let set = softwareByEquipment.get(equipmentId);
      if (!set) softwareByEquipment.set(equipmentId, (set = new Set()));
      set.add(name);
    };
    for (const s of installedSoftware) addSoftware(s.equipmentId, s.softwareProductId);
    for (const a of licenseAssignments) addSoftware(a.equipmentId, licenseProductId.get(a.licenseId));

    const linkedIds = new Map<string, string[]>();
    const addLink = (from: string, to: string) => {
      const list = linkedIds.get(from);
      if (list) list.push(to);
      else linkedIds.set(from, [to]);
    };
    for (const l of links) {
      addLink(l.equipmentId, l.linkedEquipmentId);
      addLink(l.linkedEquipmentId, l.equipmentId);
    }

    return equipment.map((item) => {
      const activeAssignment = activeByEquipment.get(item.id);
      const employee = activeAssignment ? employeeById.get(activeAssignment.employeeId) : undefined;
      const linked = (linkedIds.get(item.id) ?? [])
        .map((id) => equipmentById.get(id))
        .filter((e): e is Equipment => Boolean(e));
      const software = Array.from(softwareByEquipment.get(item.id) ?? []);
      const lastProtocol = lastProtocols[item.id];

      return {
        item,
        activeAssignment,
        employee,
        employeeName: employee ? employeeFullName(employee) : undefined,
        linked,
        software,
        lastProtocol,
        protocolCondition: getEffectiveCondition(item, lastProtocol),
        categoryName: categoryNameById.get(item.categoryId) ?? "—",
        locationName: locationNameById.get(item.locationId) ?? "—",
      };
    });
  }, [equipment, assignments, employees, links, installedSoftware, softwareProducts, licenseAssignments, licenses, lastProtocols, categories, locations]);
  const sortedRows = useMemo(() => {
    type Row = (typeof rows)[number];
    const comparators: Record<string, (a: Row, b: Row) => number> = {
      inventoryNumber: (a, b) => compareStrings(a.item.inventoryNumber, b.item.inventoryNumber),
      category: (a, b) => compareStrings(a.categoryName, b.categoryName),
      employee: (a, b) => compareStrings(a.employeeName ?? "", b.employeeName ?? ""),
      assignmentDates: (a, b) =>
        compareStrings(a.activeAssignment?.assignedAt ?? "", b.activeAssignment?.assignedAt ?? ""),
      name: (a, b) => compareStrings(a.item.name, b.item.name),
      serialNumber: (a, b) => compareStrings(a.item.serialNumber ?? "", b.item.serialNumber ?? ""),
      software: (a, b) => compareNumbers(a.software.length, b.software.length),
      linkedEquipment: (a, b) => compareNumbers(a.linked.length, b.linked.length),
      status: (a, b) => compareStrings(statusLookup(a.item.status).label, statusLookup(b.item.status).label),
      location: (a, b) => compareStrings(a.locationName, b.locationName),
      notes: (a, b) => compareStrings(a.item.notes ?? "", b.item.notes ?? ""),
      lastProtocol: (a, b) => compareStrings(a.lastProtocol?.createdAt ?? "", b.lastProtocol?.createdAt ?? ""),
      protocolCondition: (a, b) => compareStrings(a.protocolCondition ?? "", b.protocolCondition ?? ""),
      domain: (a, b) => compareNumbers(a.item.inDomain ? 1 : 0, b.item.inDomain ? 1 : 0),
      invoice: (a, b) => compareNumbers(a.item.purchaseInvoicePath ? 1 : 0, b.item.purchaseInvoicePath ? 1 : 0),
    };
    return applySort(rows, sortKey, sortDir, comparators);
  }, [rows, sortKey, sortDir, statusLookup]);

  return (
    <div className="flex flex-col gap-3">
      {deleteError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {deleteError}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
            {(isAdmin || canEditEquipment || canTransferEquipment) && (
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Zaznacz wszystkie widoczne pozycje"
                  className="h-4 w-4 rounded border-border text-primary"
                />
              </th>
            )}
            <th className="w-10 px-3 py-2.5 font-medium">L.p.</th>
            {visibleColumns.map((col) => (
              <SortableTh
                key={col}
                label={EQUIPMENT_COLUMN_LABELS[col]}
                sortKey={col}
                currentKey={sortKey}
                direction={sortDir}
                onSort={(k) => toggleSort(k as EquipmentColumnKey)}
                className="whitespace-nowrap px-3 py-2.5 font-medium"
              />
            ))}
            {(isAdmin || canEditEquipment || canTransferEquipment) && (
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Akcje</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(({ item, activeAssignment, employeeName, linked, software, lastProtocol, protocolCondition, categoryName, locationName }, index) => {
            return (
              <tr
                key={item.id}
                className={clsx(
                  "cursor-pointer border-b border-border last:border-0 hover:bg-primary/5",
                  index % 2 === 1 && "bg-black/[0.015]"
                )}
                style={{
                  color: adaptColorForTheme(statusLookup(item.status).textColor, isDark),
                  backgroundColor: statusLookup(item.status).backgroundColor
                    ? `${statusLookup(item.status).backgroundColor}2e`
                    : undefined,
                }}
                onClick={() => router.push(`/sprzet/${item.id}`)}
              >
                {(isAdmin || canEditEquipment || canTransferEquipment) && (
                  <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                      aria-label={`Zaznacz ${item.name}`}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                  </td>
                )}
                <td className="px-3 py-2 align-middle text-xs">{index + 1}</td>
                {visibleColumns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 align-middle"
                    style={columnColors[col] ? { color: adaptColorForTheme(columnColors[col], isDark) } : undefined}
                  >
                    {renderCell(col, item, {
                      categoryName,
                      locationName,
                      employeeName,
                      activeAssignment,
                      linked,
                      software,
                      categories: editableCategories,
                      statuses: statusList,
                      canEdit: canEditEquipment,
                      lastProtocol,
                      protocolCondition,
                      onSave: (patch) => saveField(item, patch),
                      onSaveStatus: (status) => saveStatus(item, status),
                      onOpenProtocol: handleOpenProtocol,
                      onOpenInvoice: handleOpenInvoice,
                    })}
                  </td>
                ))}
                {(isAdmin || canEditEquipment || canTransferEquipment) && (
                  <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {(isAdmin || canEditEquipment) && (
                        <Link
                          prefetch={false}
                          href={`/sprzet/${item.id}?edit=1`}
                          title="Edytuj sprzęt"
                          className="rounded-md p-1.5 text-current hover:bg-black/5 hover:text-primary"
                        >
                          <Pencil size={15} />
                        </Link>
                      )}
                      {(isAdmin || canTransferEquipment) && (
                        <Link
                          prefetch={false}
                          href={`/sprzet/${item.id}/przekaz`}
                          title="Przydziel sprzęt"
                          className="rounded-md p-1.5 text-current hover:bg-black/5 hover:text-primary"
                        >
                          <ArrowRightLeft size={15} />
                        </Link>
                      )}
                      {(isAdmin || canEditEquipment) && (
                        <button
                          type="button"
                          title="Usuń sprzęt"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-md p-1.5 text-current hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Usunąć ten sprzęt?"
        description={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.inventoryNumber}). Tej operacji nie można cofnąć. Jeśli sprzęt ma powiązane protokoły, usunięcie zostanie zablokowane — usuń je najpierw.`
            : undefined
        }
        confirmLabel={isDeleting ? "Usuwanie…" : "Usuń"}
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function renderCell(
  col: EquipmentColumnKey,
  item: Equipment,
  extra: {
    categoryName: string;
    locationName: string;
    employeeName?: string;
    activeAssignment?: Assignment;
    linked: Equipment[];
    software: string[];
    categories: Category[];
    statuses: EquipmentStatusDef[];
    canEdit: boolean;
    lastProtocol?: LastProtocolInfo;
    protocolCondition?: string | null;
    onSave: (patch: Partial<EquipmentInput>) => Promise<{ ok: boolean; error?: string }>;
    onSaveStatus: (status: string) => Promise<{ ok: boolean; error?: string }>;
    onOpenProtocol: (e: React.MouseEvent, protocol: LastProtocolInfo) => void;
    onOpenInvoice: (e: React.MouseEvent, path: string) => void;
  }
) {
  switch (col) {
    case "inventoryNumber":
      return (
        <Link
          prefetch={false}
          href={`/sprzet/${item.id}`}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {item.inventoryNumber}
        </Link>
      );
    case "category":
      if (!extra.canEdit) return extra.categoryName;
      return (
        <EditableCell
          value={item.categoryId}
          displayValue={extra.categoryName}
          options={extra.categories
            .filter((c) => !c.isArchived || c.id === item.categoryId)
            .map((c) => ({ value: c.id, label: c.name }))}
          onSave={(v) => extra.onSave({ categoryId: v })}
        />
      );
    case "employee":
      return extra.employeeName ?? <span>—</span>;
    case "assignmentDates":
      return extra.activeAssignment ? (
        <span className="whitespace-nowrap">
          {formatDate(extra.activeAssignment.assignedAt)} –{" "}
          {extra.activeAssignment.returnedAt ? formatDate(extra.activeAssignment.returnedAt) : "obecnie"}
        </span>
      ) : (
        <span>—</span>
      );
    case "name":
      if (!extra.canEdit) return item.name;
      return <EditableCell value={item.name} onSave={(v) => extra.onSave({ name: v })} />;
    case "serialNumber":
      if (!extra.canEdit) return item.serialNumber ?? <span>—</span>;
      return (
        <EditableCell
          value={item.serialNumber ?? ""}
          displayValue={item.serialNumber ?? <span>—</span>}
          onSave={(v) => extra.onSave({ serialNumber: v || null })}
        />
      );
    case "software":
      return <ExpandableList items={extra.software} />;
    case "linkedEquipment":
      return <ExpandableList items={extra.linked.map((l) => l.name)} />;
    case "status":
      if (!extra.canEdit) return <StatusBadge status={item.status} />;
      return (
        <EditableCell
          value={item.status}
          displayValue={<StatusBadge status={item.status} />}
          options={extra.statuses.map((s) => ({ value: s.key, label: s.label }))}
          onSave={extra.onSaveStatus}
        />
      );
    case "location":
      // Lokalizacja sprzętu jest zarządzana automatycznie (synchronizowana z pracownikiem
      // przy przekazaniu, ustawiana na magazyn przy zwrocie) — nie edytujemy jej ręcznie.
      return extra.locationName;
    case "notes":
      if (!extra.canEdit) {
        return item.notes ? (
          <span className="block max-w-[320px] whitespace-pre-wrap break-words">{item.notes}</span>
        ) : (
          <span>—</span>
        );
      }
      return (
        <EditableCell
          value={item.notes ?? ""}
          displayValue={
            item.notes ? (
              <span className="block max-w-[320px] whitespace-pre-wrap break-words">{item.notes}</span>
            ) : (
              <span>—</span>
            )
          }
          multiline
          onSave={(v) => extra.onSave({ notes: v || null })}
        />
      );
    case "lastProtocol":
      if (!extra.lastProtocol) return <span>—</span>;
      if (extra.lastProtocol.pdfStatus !== "wygenerowany") {
        return (
          <span title="Protokół jeszcze nie wygenerowany — sprawdź listę Protokołów">
            <FileText size={16} className="opacity-40" />
          </span>
        );
      }
      return (
        <button
          type="button"
          onClick={(e) => extra.onOpenProtocol(e, extra.lastProtocol!)}
          title={`Otwórz protokół ${extra.lastProtocol.protocolNumber}`}
          className="text-current hover:text-primary"
        >
          <FileText size={16} />
        </button>
      );
    case "protocolCondition":
      return extra.protocolCondition ?? <span>—</span>;
    case "domain":
      if (!extra.canEdit) return item.inDomain ? "TAK" : "NIE";
      return (
        <EditableCell
          value={item.inDomain ? "tak" : "nie"}
          displayValue={item.inDomain ? "TAK" : "NIE"}
          options={[
            { value: "tak", label: "TAK" },
            { value: "nie", label: "NIE" },
          ]}
          onSave={(v) => extra.onSave({ inDomain: v === "tak" })}
        />
      );
    case "invoice":
      if (!item.purchaseInvoicePath) return <span>—</span>;
      return (
        <button
          type="button"
          onClick={(e) => extra.onOpenInvoice(e, item.purchaseInvoicePath!)}
          title="Otwórz fakturę zakupu"
          className="text-current hover:text-primary"
        >
          <Receipt size={16} />
        </button>
      );
    default:
      return null;
  }
}
