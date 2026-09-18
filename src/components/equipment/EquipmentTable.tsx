"use client";

import Link from "next/link";
import clsx from "clsx";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { EditableCell } from "@/components/equipment/EditableCell";
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
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();

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
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-10 px-3 py-2.5 font-medium">L.p.</th>
            {visibleColumns.map((col) => (
              <th key={col} className="whitespace-nowrap px-3 py-2.5 font-medium">
                {EQUIPMENT_COLUMN_LABELS[col]}
              </th>
            ))}
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
              </tr>
            );
          })}
        </tbody>
      </table>
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
