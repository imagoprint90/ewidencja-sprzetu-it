"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRightLeft, FileText, Pencil, Trash2 } from "lucide-react";
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
  Protocol,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  SoftwareProduct,
} from "@/lib/types";
import { EQUIPMENT_COLUMN_LABELS, EQUIPMENT_STATUS_COLORS, EQUIPMENT_STATUS_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { EditableCell } from "@/components/ui/EditableCell";
import { formatDate } from "@/lib/format";
import {
  equipmentToInput,
  getActiveAssignment,
  getCategoryName,
  getLinkedEquipment,
  getLocationName,
} from "@/lib/equipment-helpers";
import { useIsAdmin } from "@/lib/current-user-context";
import type { ProtocolItemLink } from "@/lib/supabase/queries";
import {
  deleteEquipmentAction,
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
  protocols,
  protocolItemLinks,
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
  protocols: Protocol[];
  protocolItemLinks: ProtocolItemLink[];
  visibleColumns: EquipmentColumnKey[];
  columnColors: Partial<Record<EquipmentColumnKey, string>>;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

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

  function getLastProtocol(equipmentId: string): Protocol | undefined {
    const protocolIds = protocolItemLinks
      .filter((l) => l.equipmentId === equipmentId)
      .map((l) => l.protocolId);
    return protocols
      .filter((p) => protocolIds.includes(p.id))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  }

  async function handleOpenProtocol(e: React.MouseEvent, protocol: Protocol) {
    e.stopPropagation();
    if (!protocol.pdfPath) return;
    const result = await getProtocolDownloadUrlAction(protocol.pdfPath);
    if (result.ok) window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

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
            {isAdmin && (
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
              <th key={col} className="whitespace-nowrap px-3 py-2.5 font-medium">
                {EQUIPMENT_COLUMN_LABELS[col]}
              </th>
            ))}
            {isAdmin && <th className="whitespace-nowrap px-3 py-2.5 font-medium">Akcje</th>}
          </tr>
        </thead>
        <tbody>
          {equipment.map((item, index) => {
            const activeAssignment = getActiveAssignment(assignments, item.id);
            const employee = activeAssignment
              ? employees.find((e) => e.id === activeAssignment.employeeId)
              : undefined;
            const linked = getLinkedEquipment(links, equipment, item.id);
            const installedNames = installedSoftware
              .filter((s) => s.equipmentId === item.id)
              .map((s) => softwareProducts.find((p) => p.id === s.softwareProductId)?.name)
              .filter((name): name is string => Boolean(name));
            const licensedNames = licenseAssignments
              .filter((a) => a.equipmentId === item.id)
              .map((a) => {
                const license = licenses.find((l) => l.id === a.licenseId);
                return license ? softwareProducts.find((p) => p.id === license.productId)?.name : undefined;
              })
              .filter((name): name is string => Boolean(name));
            const software = Array.from(new Set([...installedNames, ...licensedNames]));
            const lastProtocol = getLastProtocol(item.id);

            return (
              <tr
                key={item.id}
                className={clsx(
                  "cursor-pointer border-b border-border last:border-0 hover:bg-primary/5",
                  index % 2 === 1 && "bg-black/[0.015]"
                )}
                style={{ color: EQUIPMENT_STATUS_COLORS[item.status] }}
                onClick={() => router.push(`/sprzet/${item.id}`)}
              >
                {isAdmin && (
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
                    style={columnColors[col] ? { color: columnColors[col] } : undefined}
                  >
                    {renderCell(col, item, {
                      categoryName: getCategoryName(categories, item.categoryId),
                      locationName: getLocationName(locations, item.locationId),
                      employeeName: employee?.fullName,
                      activeAssignment,
                      linked,
                      software,
                      categories,
                      isAdmin,
                      lastProtocol,
                      onSave: (patch) => saveField(item, patch),
                      onSaveStatus: (status) => saveStatus(item, status),
                      onOpenProtocol: handleOpenProtocol,
                    })}
                  </td>
                ))}
                {isAdmin && (
                  <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/sprzet/${item.id}?edit=1`}
                        title="Edytuj sprzęt"
                        className="rounded-md p-1.5 text-current hover:bg-black/5 hover:text-primary"
                      >
                        <Pencil size={15} />
                      </Link>
                      <Link
                        href={`/sprzet/${item.id}/przekaz`}
                        title="Przydziel sprzęt"
                        className="rounded-md p-1.5 text-current hover:bg-black/5 hover:text-primary"
                      >
                        <ArrowRightLeft size={15} />
                      </Link>
                      <button
                        type="button"
                        title="Usuń sprzęt"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-md p-1.5 text-current hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
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
    isAdmin: boolean;
    lastProtocol?: Protocol;
    onSave: (patch: Partial<EquipmentInput>) => Promise<{ ok: boolean; error?: string }>;
    onSaveStatus: (status: string) => Promise<{ ok: boolean; error?: string }>;
    onOpenProtocol: (e: React.MouseEvent, protocol: Protocol) => void;
  }
) {
  switch (col) {
    case "inventoryNumber":
      return (
        <Link
          href={`/sprzet/${item.id}`}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {item.inventoryNumber}
        </Link>
      );
    case "category":
      if (!extra.isAdmin) return extra.categoryName;
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
      return extra.employeeName ?? "Nieprzydzielony";
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
      if (!extra.isAdmin) return item.name;
      return <EditableCell value={item.name} onSave={(v) => extra.onSave({ name: v })} />;
    case "serialNumber":
      if (!extra.isAdmin) return item.serialNumber ?? <span>—</span>;
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
      if (!extra.isAdmin) return <StatusBadge status={item.status} />;
      return (
        <EditableCell
          value={item.status}
          displayValue={<StatusBadge status={item.status} />}
          options={Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          onSave={extra.onSaveStatus}
        />
      );
    case "location":
      // Lokalizacja sprzętu jest zarządzana automatycznie (synchronizowana z pracownikiem
      // przy przekazaniu, ustawiana na magazyn przy zwrocie) — nie edytujemy jej ręcznie.
      return extra.locationName;
    case "notes":
      if (!extra.isAdmin) {
        return item.notes ? (
          <span className="line-clamp-2 max-w-[220px]">{item.notes}</span>
        ) : (
          <span>—</span>
        );
      }
      return (
        <EditableCell
          value={item.notes ?? ""}
          displayValue={
            item.notes ? (
              <span className="line-clamp-2 max-w-[220px]">{item.notes}</span>
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
    default:
      return null;
  }
}
