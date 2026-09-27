"use client";

import { inputClass } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { employeeFullName } from "@/lib/equipment-helpers";
import type { Employee } from "@/lib/types";

export const MANUAL_OPTION = "__manual__";

// Wybór pracownika z wyszukiwarki, z opcją wpisania nazwiska ręcznie, gdy osoby nie ma na
// liście (np. była zatrudniona przed wprowadzeniem systemu). Ten sam wzorzec co "Osoba
// przekazująca" w formularzu przekazania sprzętu.
export function EmployeeOrManualSelect({
  employees,
  selectValue,
  onSelectChange,
  manualValue,
  onManualChange,
  placeholder = "— brak",
  searchPlaceholder = "Szukaj pracownika…",
  manualPlaceholder = "Imię i nazwisko",
}: {
  employees: Employee[];
  // Id pracownika, MANUAL_OPTION (wpisz ręcznie), albo "" (brak wyboru).
  selectValue: string;
  onSelectChange: (value: string) => void;
  manualValue: string;
  onManualChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  manualPlaceholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex-1">
        <SearchableSelect
          options={[
            ...employees.map((e) => ({ value: e.id, label: employeeFullName(e) })),
            { value: MANUAL_OPTION, label: "Inna osoba (wpisz ręcznie)" },
          ]}
          value={selectValue}
          onChange={onSelectChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
        />
      </div>
      {selectValue === MANUAL_OPTION && (
        <input
          className={inputClass}
          placeholder={manualPlaceholder}
          value={manualValue}
          onChange={(e) => onManualChange(e.target.value)}
        />
      )}
    </div>
  );
}
