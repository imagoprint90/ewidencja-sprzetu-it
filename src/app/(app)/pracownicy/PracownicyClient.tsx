"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EditableCell } from "@/components/ui/EditableCell";
import { ColumnPicker } from "@/components/ui/ColumnPicker";
import { useIsAdmin } from "@/lib/current-user-context";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { getLocationName } from "@/lib/equipment-helpers";
import { parseCsv, normalizeHeader } from "@/lib/csv";
import {
  DEFAULT_EMPLOYEE_FILTERS,
  EmployeeFilters,
  type EmployeeFiltersState,
} from "@/components/employees/EmployeeFilters";
import {
  importEmployeesAction,
  updateEmployeeAction,
  type EmployeeCsvRow,
} from "@/lib/supabase/actions/employee-actions";
import type { Employee, Location } from "@/lib/types";

const FULL_NAME_ALIASES = ["imie i nazwisko", "imie nazwisko", "pracownik"];
const EMAIL_ALIASES = ["email", "e-mail", "adres e-mail", "adres email"];
const PHONE_ALIASES = ["telefon", "nr telefonu", "numer telefonu", "tel"];
const DEPARTMENT_ALIASES = ["dzial"];
const LOCATION_ALIASES = ["lokalizacja"];

type EmployeeColumnKey = "email" | "phone" | "department" | "location" | "assignedEquipment" | "status";

const EMPLOYEE_COLUMNS: EmployeeColumnKey[] = [
  "email",
  "phone",
  "department",
  "location",
  "assignedEquipment",
  "status",
];
const EMPLOYEE_COLUMN_LABELS: Record<EmployeeColumnKey, string> = {
  email: "Email",
  phone: "Telefon",
  department: "Dział",
  location: "Lokalizacja",
  assignedEquipment: "Przydzielony sprzęt",
  status: "Status",
};
const DEFAULT_EMPLOYEE_COLUMNS: EmployeeColumnKey[] = [
  "email",
  "phone",
  "department",
  "location",
  "assignedEquipment",
  "status",
];

export function PracownicyClient({
  employees,
  assignedCounts,
  locations,
}: {
  employees: Employee[];
  assignedCounts: Record<string, number>;
  locations: Location[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [filters, setFilters] = useLocalStorage<EmployeeFiltersState>(
    "pracownicy-filtry",
    DEFAULT_EMPLOYEE_FILTERS
  );
  const [visibleColumns, setVisibleColumns] = useLocalStorage<EmployeeColumnKey[]>(
    "pracownicy-kolumny",
    DEFAULT_EMPLOYEE_COLUMNS
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isImporting, startImportTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveField(
    item: Employee,
    patch: Partial<{ email: string | null; phone: string | null; department: string | null }>
  ) {
    const result = await updateEmployeeAction(item.id, {
      fullName: item.fullName,
      email: patch.email !== undefined ? patch.email : item.email,
      phone: patch.phone !== undefined ? patch.phone : item.phone,
      department: patch.department !== undefined ? patch.department : item.department,
      locationId: item.locationId,
    });
    if (result.ok) router.refresh();
    return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
  }

  const departments = useMemo(
    () =>
      Array.from(new Set(employees.map((e) => e.department).filter((d): d is string => Boolean(d)))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return employees.filter((e) => {
      if (filters.statuses.length > 0) {
        const status = e.isActive ? "aktywny" : "nieaktywny";
        if (!filters.statuses.includes(status)) return false;
      }
      if (filters.locationIds.length > 0 && (!e.locationId || !filters.locationIds.includes(e.locationId)))
        return false;
      if (filters.departments.length > 0 && (!e.department || !filters.departments.includes(e.department)))
        return false;
      if (!q) return true;
      return [e.fullName, e.email ?? "", e.phone ?? "", e.department ?? "", getLocationName(locations, e.locationId)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [employees, filters, locations]);

  function handleFilePicked(file: File) {
    setImportError(null);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setImportError("Plik CSV jest pusty albo zawiera tylko nagłówek.");
        return;
      }

      const [header, ...dataRows] = rows;
      const normalizedHeader = header.map(normalizeHeader);
      const nameIdx = normalizedHeader.findIndex((h) => FULL_NAME_ALIASES.includes(h));
      const emailIdx = normalizedHeader.findIndex((h) => EMAIL_ALIASES.includes(h));
      const phoneIdx = normalizedHeader.findIndex((h) => PHONE_ALIASES.includes(h));
      const deptIdx = normalizedHeader.findIndex((h) => DEPARTMENT_ALIASES.includes(h));
      const locIdx = normalizedHeader.findIndex((h) => LOCATION_ALIASES.includes(h));

      if (nameIdx === -1) {
        setImportError(
          'Nagłówek pliku musi zawierać kolumnę "Imię i nazwisko" (kolumny "Email", "Telefon", "Dział" i "Lokalizacja" są opcjonalne).'
        );
        return;
      }

      const parsedRows: EmployeeCsvRow[] = dataRows
        .filter((r) => r.some((cell) => cell.trim() !== ""))
        .map((r) => ({
          fullName: r[nameIdx] ?? "",
          email: emailIdx !== -1 ? r[emailIdx] ?? "" : "",
          phone: phoneIdx !== -1 ? r[phoneIdx] ?? "" : "",
          department: deptIdx !== -1 ? r[deptIdx] ?? "" : "",
          locationName: locIdx !== -1 ? r[locIdx] ?? "" : "",
        }));

      if (parsedRows.length === 0) {
        setImportError("Nie znaleziono żadnych wierszy z danymi.");
        return;
      }

      startImportTransition(async () => {
        const result = await importEmployeesAction(parsedRows);
        if (!result.ok) {
          setImportError(result.error);
          return;
        }
        const { imported, errors } = result.data;
        setImportResult(
          errors.length === 0
            ? `Zaimportowano ${imported} pracowników.`
            : `Zaimportowano ${imported} z ${parsedRows.length}. Pominięte wiersze: ${errors
                .map((e) => `#${e.row} (${e.reason})`)
                .join(", ")}.`
        );
        router.refresh();
      });
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Pracownicy</h1>
          <p className="text-sm text-muted">
            {filtered.length} z {employees.length} pozycji
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFilePicked(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload size={16} />
              {isImporting ? "Importowanie…" : "Importuj CSV"}
            </Button>
            <Link href="/pracownicy/nowy">
              <Button>
                <Plus size={16} />
                Dodaj pracownika
              </Button>
            </Link>
          </div>
        )}
      </div>

      {importError && (
        <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {importError}
        </p>
      )}
      {importResult && (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">{importResult}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <EmployeeFilters value={filters} onChange={setFilters} locations={locations} departments={departments} />
        <ColumnPicker
          allColumns={EMPLOYEE_COLUMNS}
          labels={EMPLOYEE_COLUMN_LABELS}
          visible={visibleColumns}
          onChange={setVisibleColumns}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Brak pracowników spełniających kryteria"
          action={
            isAdmin ? (
              <Link href="/pracownicy/nowy">
                <Button variant="secondary">Dodaj pierwszego pracownika</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Imię i nazwisko</th>
                {visibleColumns.map((col) => (
                  <th key={col} className="px-4 py-3 font-medium">
                    {EMPLOYEE_COLUMN_LABELS[col]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02]"
                  onClick={() => router.push(`/pracownicy/${e.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link href={`/pracownicy/${e.id}`} className="font-medium text-primary hover:underline">
                      {e.fullName}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col} className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                      {col === "email" &&
                        (isAdmin ? (
                          <EditableCell
                            value={e.email ?? ""}
                            displayValue={e.email ?? <span className="text-muted">—</span>}
                            onSave={(v) => saveField(e, { email: v || null })}
                          />
                        ) : (
                          (e.email ?? "—")
                        ))}
                      {col === "phone" &&
                        (isAdmin ? (
                          <EditableCell
                            value={e.phone ?? ""}
                            displayValue={e.phone ?? <span className="text-muted">—</span>}
                            onSave={(v) => saveField(e, { phone: v || null })}
                          />
                        ) : (
                          (e.phone ?? "—")
                        ))}
                      {col === "department" &&
                        (isAdmin ? (
                          <EditableCell
                            value={e.department ?? ""}
                            displayValue={e.department ?? <span className="text-muted">—</span>}
                            onSave={(v) => saveField(e, { department: v || null })}
                          />
                        ) : (
                          (e.department ?? "—")
                        ))}
                      {col === "location" && getLocationName(locations, e.locationId)}
                      {col === "assignedEquipment" && `${assignedCounts[e.id] ?? 0} szt.`}
                      {col === "status" && (
                        <Badge tone={e.isActive ? "success" : "default"}>
                          {e.isActive ? "Aktywny" : "Nieaktywny"}
                        </Badge>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
