"use client";

import { Tabs } from "@/components/ui/Tabs";
import type { Department, Location } from "@/lib/types";
import { LocationsTab } from "./LocationsTab";
import { DepartmentsTab } from "./DepartmentsTab";

export function LokalizacjeClient({
  locations,
  departments,
  employeeNamesByLocation,
  equipmentNames,
  employeeNamesByDepartment,
}: {
  locations: Location[];
  departments: Department[];
  employeeNamesByLocation: Record<string, string[]>;
  equipmentNames: Record<string, string[]>;
  employeeNamesByDepartment: Record<string, string[]>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Lokalizacje</h1>
        <p className="text-sm text-muted">
          Zarządzanie lokalizacjami i działami — obie listy są z góry ustalone i tylko
          przypisywane pracownikom, zamiast wpisywane ręcznie przy każdym z nich.
        </p>
      </div>

      <Tabs
        tabs={[
          {
            key: "lokalizacje",
            label: "Lokalizacje",
            content: (
              <LocationsTab
                locations={locations}
                employeeNames={employeeNamesByLocation}
                equipmentNames={equipmentNames}
              />
            ),
          },
          {
            key: "dzialy",
            label: "Działy",
            content: <DepartmentsTab departments={departments} employeeNames={employeeNamesByDepartment} />,
          },
        ]}
      />
    </div>
  );
}
