"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Form";
import { formatDate } from "@/lib/format";
import { useIsAdmin } from "@/lib/current-user-context";
import type {
  Equipment,
  InstalledSoftware,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  SoftwareProduct,
} from "@/lib/types";
import {
  addInstalledSoftwareAction,
  removeInstalledSoftwareAction,
} from "@/lib/supabase/actions/software-actions";

export function SoftwareTab({
  equipment,
  products,
  installedSoftware,
  licenses,
  licenseAssignments,
}: {
  equipment: Equipment;
  products: SoftwareProduct[];
  installedSoftware: InstalledSoftware[];
  licenses: SoftwareLicense[];
  licenseAssignments: SoftwareLicenseAssignment[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [error, setError] = useState<string | null>(null);

  const installed = installedSoftware.filter((s) => s.equipmentId === equipment.id);
  const deviceLicenseAssignments = licenseAssignments.filter((a) => a.equipmentId === equipment.id);

  function handleAdd() {
    if (!selectedProduct) return;
    startTransition(async () => {
      const result = await addInstalledSoftwareAction({
        equipmentId: equipment.id,
        softwareProductId: selectedProduct,
        notes: null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelectedProduct("");
      setError(null);
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeInstalledSoftwareAction(id, equipment.id);
      router.refresh();
    });
  }

  const availableProducts = products.filter((p) => !installed.some((i) => i.softwareProductId === p.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold">Zainstalowane oprogramowanie</h2>
        {installed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
            Nie oznaczono żadnego oprogramowania jako zainstalowanego na tym sprzęcie.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {installed.map((s) => {
              const product = products.find((p) => p.id === s.softwareProductId);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm"
                >
                  <span>
                    {product?.name ?? "Nieznany produkt"} {product?.version ?? ""}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(s.id)}
                      className="text-muted hover:text-danger"
                      aria-label="Usuń"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isAdmin && availableProducts.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              className={inputClass}
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">Wybierz oprogramowanie…</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.version ?? ""}
                </option>
              ))}
            </select>
            <Button variant="secondary" disabled={!selectedProduct || isPending} onClick={handleAdd}>
              <Plus size={14} />
              Oznacz jako zainstalowane
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Licencje przypisane do tego urządzenia</h2>
        {deviceLicenseAssignments.length === 0 ? (
          <p className="text-sm text-muted">Brak licencji przypisanych bezpośrednio do tego sprzętu.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {deviceLicenseAssignments.map((a) => {
              const license = licenses.find((l) => l.id === a.licenseId);
              const product = products.find((p) => p.id === license?.productId);
              return (
                <li key={a.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <span className="font-medium">{product?.name ?? "Nieznany produkt"}</span>
                  <span className="ml-2 text-xs text-muted">
                    ważna do {license?.validUntil ? formatDate(license.validUntil) : "bezterminowo"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">
          Zarządzanie licencjami (dodawanie, przypisywanie) odbywa się na stronie{" "}
          <Link href="/oprogramowanie" className="text-primary hover:underline">
            Oprogramowanie
          </Link>
          . Klucze aktywacyjne nie są przechowywane ani wyświetlane.
        </p>
      </div>
    </div>
  );
}
