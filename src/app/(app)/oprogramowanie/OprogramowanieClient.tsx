"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, History, Pencil, Plus, Receipt, Search, Trash2, Upload } from "lucide-react";
import { parseCsv, normalizeHeader } from "@/lib/csv";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { InvoiceAttachment } from "@/components/equipment/InvoiceAttachment";
import { LicenseHistory } from "./LicenseHistory";
import { LicenseKey } from "./LicenseKey";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { formatDate } from "@/lib/format";
import { employeeFullName } from "@/lib/equipment-helpers";
import { useIsAdmin } from "@/lib/current-user-context";
import {
  LICENSE_TYPE_LABELS,
  type Employee,
  type Equipment,
  type LicenseHistoryEntry,
  type LicenseType,
  type SoftwareLicense,
  type SoftwareLicenseAssignment,
  type SoftwareProduct,
} from "@/lib/types";
import {
  addSoftwareLicenseAction,
  addSoftwareProductAction,
  assignLicenseAction,
  deleteLicenseInvoiceAction,
  deleteSoftwareLicenseAction,
  deleteSoftwareProductAction,
  getLicenseInvoiceUrlAction,
  importSoftwareProductsAction,
  setLicenseKeyAction,
  uploadLicenseInvoiceAction,
  removeLicenseAssignmentAction,
  type SoftwareCsvRow,
  updateSoftwareLicenseAction,
  updateSoftwareProductAction,
} from "@/lib/supabase/actions/software-actions";

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-3 max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

export function OprogramowanieClient({
  products,
  licenses,
  assignments,
  equipment,
  employees,
  history,
  keyLicenseIds,
}: {
  products: SoftwareProduct[];
  licenses: SoftwareLicense[];
  assignments: SoftwareLicenseAssignment[];
  equipment: Equipment[];
  employees: Employee[];
  history: LicenseHistoryEntry[];
  keyLicenseIds: string[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productName, setProductName] = useState("");
  const [productVersion, setProductVersion] = useState("");
  const [productError, setProductError] = useState<string | null>(null);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductVersion, setEditProductVersion] = useState("");
  const [editProductError, setEditProductError] = useState<string | null>(null);

  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [editSeatsTotal, setEditSeatsTotal] = useState("1");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editLicenseNotes, setEditLicenseNotes] = useState("");
  const [editLicenseError, setEditLicenseError] = useState<string | null>(null);

  const [showAddLicense, setShowAddLicense] = useState(false);
  const [licenseProductId, setLicenseProductId] = useState("");
  const [licenseType, setLicenseType] = useState<LicenseType>("urzadzenie");
  const [seatsTotal, setSeatsTotal] = useState("1");
  const [validUntil, setValidUntil] = useState("");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const [expandedLicenseId, setExpandedLicenseId] = useState<string | null>(null);
  const [historyLicenseId, setHistoryLicenseId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [licenseQuery, setLicenseQuery] = useState("");
  const [deleteProductTarget, setDeleteProductTarget] = useState<SoftwareProduct | null>(null);
  const [deleteLicenseTarget, setDeleteLicenseTarget] = useState<SoftwareLicense | null>(null);
  const [deleteLicenseError, setDeleteLicenseError] = useState<string | null>(null);
  const [productsCollapsed, setProductsCollapsed] = useLocalStorage("oprogramowanie-produkty-zwiniete", false);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [newLicenseKey, setNewLicenseKey] = useState("");
  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [assignTarget, setAssignTarget] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  function handleAddProduct() {
    startTransition(async () => {
      const result = await addSoftwareProductAction({
        name: productName,
        version: productVersion.trim() || null,
        notes: null,
      });
      if (!result.ok) {
        setProductError(result.error);
        return;
      }
      setProductName("");
      setProductVersion("");
      setProductError(null);
      setShowAddProduct(false);
      router.refresh();
    });
  }

  function handleProductsFilePicked(file: File) {
    setImportError(null);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) {
        setImportError("Plik CSV jest pusty albo zawiera tylko nagłówek.");
        return;
      }
      const [header, ...dataRows] = rows;
      const norm = header.map(normalizeHeader);
      const nameIdx = norm.findIndex((h) => ["nazwa", "produkt", "nazwa produktu"].includes(h));
      const versionIdx = norm.findIndex((h) => ["wersja"].includes(h));
      const notesIdx = norm.findIndex((h) => ["uwagi", "notatki"].includes(h));
      if (nameIdx === -1) {
        setImportError('Nagłówek pliku musi zawierać kolumnę "Nazwa" (kolumny "Wersja" i "Uwagi" są opcjonalne).');
        return;
      }
      const parsed: SoftwareCsvRow[] = dataRows
        .filter((r) => r.some((c) => c.trim() !== ""))
        .map((r) => ({
          name: r[nameIdx] ?? "",
          version: versionIdx !== -1 ? (r[versionIdx] ?? "") : "",
          notes: notesIdx !== -1 ? (r[notesIdx] ?? "") : "",
        }));
      if (parsed.length === 0) {
        setImportError("Nie znaleziono żadnych wierszy z danymi.");
        return;
      }
      startTransition(async () => {
        const result = await importSoftwareProductsAction(parsed);
        if (!result.ok) {
          setImportError(result.error);
          return;
        }
        const { imported, skipped } = result.data;
        setImportResult(
          skipped.length === 0
            ? `Zaimportowano ${imported} produktów.`
            : `Zaimportowano ${imported} z ${parsed.length}. Pominięte wiersze: ${skipped
                .map((s) => `#${s.row} (${s.reason})`)
                .join(", ")}.`
        );
        router.refresh();
      });
    };
    reader.readAsText(file, "UTF-8");
  }

  function startEditProduct(p: SoftwareProduct) {
    setEditingProductId(p.id);
    setEditProductName(p.name);
    setEditProductVersion(p.version ?? "");
    setEditProductError(null);
  }

  function handleSaveProduct(id: string) {
    startTransition(async () => {
      const result = await updateSoftwareProductAction(id, {
        name: editProductName,
        version: editProductVersion.trim() || null,
        notes: null,
      });
      if (!result.ok) {
        setEditProductError(result.error);
        return;
      }
      setEditingProductId(null);
      router.refresh();
    });
  }

  function startEditLicense(license: SoftwareLicense) {
    setEditingLicenseId(license.id);
    setEditSeatsTotal(String(license.seatsTotal));
    setEditValidUntil(license.validUntil ?? "");
    setEditPurchaseDate(license.purchaseDate ?? "");
    setEditLicenseNotes(license.notes ?? "");
    setEditLicenseError(null);
  }

  function handleSaveLicense(id: string) {
    const seats = Number(editSeatsTotal);
    if (!Number.isInteger(seats) || seats < 1) {
      setEditLicenseError("Liczba stanowisk musi być liczbą całkowitą większą od zera.");
      return;
    }
    startTransition(async () => {
      const result = await updateSoftwareLicenseAction(id, {
        seatsTotal: seats,
        validUntil: editValidUntil || null,
        purchaseDate: editPurchaseDate || null,
        notes: editLicenseNotes.trim() || null,
      });
      if (!result.ok) {
        setEditLicenseError(result.error);
        return;
      }
      setEditingLicenseId(null);
      router.refresh();
    });
  }

  function handleAddLicense() {
    const seats = Number(seatsTotal);
    if (!licenseProductId) {
      setLicenseError("Wybierz produkt.");
      return;
    }
    if (!Number.isInteger(seats) || seats < 1) {
      setLicenseError("Liczba stanowisk musi być liczbą całkowitą większą od zera.");
      return;
    }
    startTransition(async () => {
      const result = await addSoftwareLicenseAction({
        productId: licenseProductId,
        licenseType,
        seatsTotal: seats,
        validUntil: validUntil || null,
        purchaseDate: purchaseDate || null,
        notes: licenseNotes.trim() || null,
      });
      if (!result.ok) {
        setLicenseError(result.error);
        return;
      }
      if (newLicenseKey.trim()) {
        const keyResult = await setLicenseKeyAction(result.data.id, newLicenseKey);
        if (!keyResult.ok) {
          setLicenseError(`Licencję dodano, ale nie zapisano klucza: ${keyResult.error}`);
          router.refresh();
          return;
        }
      }
      setLicenseProductId("");
      setSeatsTotal("1");
      setValidUntil("");
      setPurchaseDate("");
      setNewLicenseKey("");
      setLicenseNotes("");
      setLicenseError(null);
      setShowAddLicense(false);
      router.refresh();
    });
  }

  function handleAssign(license: SoftwareLicense) {
    if (!assignTarget) {
      setAssignError("Wybierz cel przypisania.");
      return;
    }
    startTransition(async () => {
      const result = await assignLicenseAction({
        licenseId: license.id,
        equipmentId: license.licenseType === "urzadzenie" ? assignTarget : null,
        employeeId: license.licenseType === "uzytkownik" ? assignTarget : null,
      });
      if (!result.ok) {
        setAssignError(result.error);
        return;
      }
      setAssignTarget("");
      setAssignError(null);
      router.refresh();
    });
  }

  const pq = productQuery.trim().toLowerCase();
  const filteredProducts = pq
    ? products.filter((p) => [p.name, p.version ?? "", p.notes ?? ""].join(" ").toLowerCase().includes(pq))
    : products;

  function assignedNames(licenseId: string): string[] {
    return assignments
      .filter((a) => a.licenseId === licenseId)
      .map((a) =>
        a.equipmentId
          ? (equipment.find((e) => e.id === a.equipmentId)?.name ?? "")
          : (() => {
              const emp = employees.find((e) => e.id === a.employeeId);
              return emp ? employeeFullName(emp) : "";
            })()
      );
  }

  const lq = licenseQuery.trim().toLowerCase();
  const filteredLicenses = lq
    ? licenses.filter((l) => {
        const product = products.find((p) => p.id === l.productId);
        return [
          product?.name ?? "",
          product?.version ?? "",
          LICENSE_TYPE_LABELS[l.licenseType],
          l.notes ?? "",
          ...assignedNames(l.id),
        ]
          .join(" ")
          .toLowerCase()
          .includes(lq);
      })
    : licenses;

  function handleDeleteProduct() {
    if (!deleteProductTarget) return;
    const id = deleteProductTarget.id;
    startTransition(async () => {
      const result = await deleteSoftwareProductAction(id);
      setDeleteProductTarget(null);
      setProductError(result.ok ? null : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleDeleteLicense() {
    if (!deleteLicenseTarget) return;
    const id = deleteLicenseTarget.id;
    startTransition(async () => {
      const result = await deleteSoftwareLicenseAction(id);
      setDeleteLicenseTarget(null);
      if (!result.ok) {
        setDeleteLicenseError(result.error);
        return;
      }
      setDeleteLicenseError(null);
      router.refresh();
    });
  }

  function handleRemoveAssignment(id: string) {
    startTransition(async () => {
      await removeLicenseAssignmentAction(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Oprogramowanie</h1>
        <p className="text-sm text-muted">
          Katalog produktów oprogramowania i rejestr licencji. Klucze licencji widzi i zarządza
          nimi wyłącznie administrator (ukryte domyślnie, pokazywane na żądanie).
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setProductsCollapsed((v) => !v)}
            aria-expanded={!productsCollapsed}
            className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
          >
            {productsCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            Produkty
            <span className="text-xs font-normal text-muted">({products.length})</span>
          </button>
          {isAdmin && !productsCollapsed && (
            <div className="flex gap-2">
              <input
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProductsFilePicked(file);
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="secondary" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Importuj CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowAddProduct((v) => !v)}>
                <Plus size={14} />
                Dodaj produkt
              </Button>
            </div>
          )}
        </div>

        {!productsCollapsed && (
          <>
        {importError && <p className="mb-3 text-sm text-danger">{importError}</p>}
        {importResult && <p className="mb-3 text-sm">{importResult}</p>}

        {showAddProduct && (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row">
            <input
              className={inputClass}
              placeholder="Nazwa (np. Microsoft Office)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Wersja (opcjonalnie)"
              value={productVersion}
              onChange={(e) => setProductVersion(e.target.value)}
            />
            <Button disabled={isPending} onClick={handleAddProduct}>
              Zapisz
            </Button>
          </div>
        )}
        {productError && <p className="mb-3 text-sm text-danger">{productError}</p>}
        <ConfirmDialog
          open={deleteProductTarget !== null}
          title="Usunąć produkt?"
          description={
            deleteProductTarget
              ? `„${deleteProductTarget.name}${deleteProductTarget.version ? " " + deleteProductTarget.version : ""}” zostanie trwale usunięty z katalogu. Tej operacji nie można cofnąć.`
              : undefined
          }
          confirmLabel="Usuń"
          danger
          onCancel={() => setDeleteProductTarget(null)}
          onConfirm={handleDeleteProduct}
        />

        {products.length > 0 && (
          <SearchBox value={productQuery} onChange={setProductQuery} placeholder="Szukaj produktu: nazwa, wersja…" />
        )}

        {products.length === 0 ? (
          <p className="text-sm text-muted">Brak produktów w katalogu.</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-muted">Brak produktów spełniających kryteria.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredProducts.map((p, index) => (
              <li key={p.id} className="flex gap-3 rounded-lg border border-border p-3">
                <span className="w-7 shrink-0 pt-1.5 text-xs text-muted" title="L.p.">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                {editingProductId === p.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className={inputClass}
                        value={editProductName}
                        onChange={(e) => setEditProductName(e.target.value)}
                        placeholder="Nazwa"
                      />
                      <input
                        className={inputClass}
                        value={editProductVersion}
                        onChange={(e) => setEditProductVersion(e.target.value)}
                        placeholder="Wersja"
                      />
                    </div>
                    {editProductError && <p className="text-sm text-danger">{editProductError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={isPending} onClick={() => handleSaveProduct(p.id)}>
                        Zapisz
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingProductId(null)}>
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Badge>
                      {p.name}
                      {p.version ? ` ${p.version}` : ""}
                    </Badge>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEditProduct(p)}>
                          <Pencil size={14} />
                          Edytuj
                        </Button>
                        {!licenses.some((l) => l.productId === p.id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Usuń produkt (możliwe tylko gdy nie ma licencji)"
                            onClick={() => setDeleteProductTarget(p)}
                          >
                            <Trash2 size={14} />
                            Usuń
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </li>
            ))}
          </ul>
        )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Licencje</h2>
          {isAdmin && (
            <Button size="sm" variant="secondary" onClick={() => setShowAddLicense((v) => !v)}>
              <Plus size={14} />
              Dodaj licencję
            </Button>
          )}
        </div>

        {showAddLicense && (
          <FormSection title="Nowa licencja">
            <FormField label="Produkt" htmlFor="licenseProductId" required>
              <SearchableSelect
                id="licenseProductId"
                value={licenseProductId}
                onChange={setLicenseProductId}
                placeholder="Wybierz produkt…"
                searchPlaceholder="Szukaj produktu…"
                options={products.map((p) => {
                  const count = licenses.filter((l) => l.productId === p.id).length;
                  return {
                    value: p.id,
                    label: p.name + (p.version ? ` ${p.version}` : ""),
                    hint: count === 0 ? "jeszcze nie użyty" : `użyty ${count}×`,
                  };
                })}
              />
            </FormField>
            <FormField label="Typ licencji" htmlFor="licenseType" required>
              <select
                id="licenseType"
                className={inputClass}
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value as LicenseType)}
              >
                {Object.entries(LICENSE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Liczba stanowisk" htmlFor="seatsTotal" required>
              <input
                id="seatsTotal"
                type="number"
                min={1}
                className={inputClass}
                value={seatsTotal}
                onChange={(e) => setSeatsTotal(e.target.value)}
              />
            </FormField>
            <FormField label="Ważna do" htmlFor="validUntil">
              <input
                id="validUntil"
                type="date"
                className={inputClass}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </FormField>
            <FormField label="Data zakupu" htmlFor="purchaseDate">
              <input
                id="purchaseDate"
                type="date"
                className={inputClass}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </FormField>
            {isAdmin && (
              <FormField label="Klucz licencji (opcjonalnie)" htmlFor="newLicenseKey">
                <input
                  id="newLicenseKey"
                  className={inputClass + " font-mono"}
                  autoComplete="off"
                  value={newLicenseKey}
                  onChange={(e) => setNewLicenseKey(e.target.value)}
                />
              </FormField>
            )}
            <FormField label="Uwagi" htmlFor="licenseNotes" full>
              <input
                id="licenseNotes"
                className={inputClass}
                value={licenseNotes}
                onChange={(e) => setLicenseNotes(e.target.value)}
              />
            </FormField>
            {licenseError && <p className="text-sm text-danger sm:col-span-2">{licenseError}</p>}
            <div className="sm:col-span-2">
              <Button disabled={isPending} onClick={handleAddLicense}>
                Zapisz licencję
              </Button>
            </div>
          </FormSection>
        )}

        {deleteLicenseError && <p className="mt-3 text-sm text-danger">{deleteLicenseError}</p>}

        <ConfirmDialog
          open={deleteLicenseTarget !== null}
          title="Usunąć licencję?"
          description="Licencja, jej klucz i załączona faktura zostaną trwale usunięte. Wpisy w historii licencji zostaną zachowane. Tej operacji nie można cofnąć."
          confirmLabel="Usuń"
          danger
          onCancel={() => setDeleteLicenseTarget(null)}
          onConfirm={handleDeleteLicense}
        />

        {licenses.length > 0 && (
          <SearchBox
            value={licenseQuery}
            onChange={setLicenseQuery}
            placeholder="Szukaj licencji: produkt, komputer, pracownik, uwagi…"
          />
        )}

        {licenses.length === 0 ? (
          <EmptyState title="Brak zarejestrowanych licencji" />
        ) : filteredLicenses.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Brak licencji spełniających kryteria.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {filteredLicenses.map((license, licenseIndex) => {
              const product = products.find((p) => p.id === license.productId);
              const used = assignments.filter((a) => a.licenseId === license.id);
              const free = license.seatsTotal - used.length;
              const expanded = expandedLicenseId === license.id;

              return (
                <div key={license.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="w-6 shrink-0 text-xs text-muted" title="L.p.">
                      {licenseIndex + 1}.
                    </span>
                    <div className="min-w-0 flex-1 basis-64">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{product?.name ?? "Nieznany produkt"}</span>
                        <span className="text-xs text-muted">{LICENSE_TYPE_LABELS[license.licenseType]}</span>
                      </div>
                      <p className="truncate text-xs text-muted" title={assignedNames(license.id).join(", ")}>
                        {used.length === 0 ? "Nieprzydzielona" : assignedNames(license.id).join(", ")}
                        <span className="opacity-70">
                          {" · "}ważna {license.validUntil ? formatDate(license.validUntil) : "bezterminowo"}
                          {license.purchaseDate && <>{" · "}zakup {formatDate(license.purchaseDate)}</>}
                        </span>
                      </p>
                    </div>
                    <Badge tone={free > 0 ? "success" : "danger"}>
                      {used.length}/{license.seatsTotal}
                    </Badge>
                    {license.invoicePath && (
                      <span title="Faktura załączona" className="text-muted">
                        <Receipt size={15} />
                      </span>
                    )}
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Historia licencji"
                        aria-label="Historia licencji"
                        onClick={() => setHistoryLicenseId(historyLicenseId === license.id ? null : license.id)}
                      >
                        <History size={15} />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Edytuj licencję"
                          aria-label="Edytuj licencję"
                          onClick={() => startEditLicense(license)}
                        >
                          <Pencil size={15} />
                        </Button>
                      )}
                      {isAdmin && used.length === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Usuń licencję (możliwe tylko gdy nie jest przydzielona)"
                          aria-label="Usuń licencję"
                          onClick={() => setDeleteLicenseTarget(license)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setExpandedLicenseId(expanded ? null : license.id);
                          setAssignError(null);
                          setAssignTarget("");
                        }}
                      >
                        {expanded ? "Zwiń" : "Szczegóły"}
                      </Button>
                    </div>
                  </div>

                  {historyLicenseId === license.id && (
                    <div className="mt-3 border-t border-border pt-3">
                      <LicenseHistory entries={history.filter((h) => h.licenseId === license.id)} />
                    </div>
                  )}

                  {editingLicenseId === license.id && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
                      <FormField label="Liczba stanowisk" htmlFor={`seats-${license.id}`}>
                        <input
                          id={`seats-${license.id}`}
                          type="number"
                          min={1}
                          className={inputClass}
                          value={editSeatsTotal}
                          onChange={(e) => setEditSeatsTotal(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Ważna do" htmlFor={`valid-${license.id}`}>
                        <input
                          id={`valid-${license.id}`}
                          type="date"
                          className={inputClass}
                          value={editValidUntil}
                          onChange={(e) => setEditValidUntil(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Data zakupu" htmlFor={`purchase-${license.id}`}>
                        <input
                          id={`purchase-${license.id}`}
                          type="date"
                          className={inputClass}
                          value={editPurchaseDate}
                          onChange={(e) => setEditPurchaseDate(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Uwagi" htmlFor={`notes-${license.id}`}>
                        <input
                          id={`notes-${license.id}`}
                          className={inputClass}
                          value={editLicenseNotes}
                          onChange={(e) => setEditLicenseNotes(e.target.value)}
                        />
                      </FormField>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={isPending} onClick={() => handleSaveLicense(license.id)}>
                          Zapisz
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLicenseId(null)}>
                          Anuluj
                        </Button>
                      </div>
                      {editLicenseError && <p className="text-sm text-danger sm:basis-full">{editLicenseError}</p>}
                    </div>
                  )}

                  {expanded && (
                    <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InvoiceAttachment
                          bare
                          label="Faktura VAT"
                          equipmentId={license.id}
                          path={license.invoicePath}
                          canEdit={isAdmin}
                          handlers={{
                            upload: uploadLicenseInvoiceAction,
                            remove: deleteLicenseInvoiceAction,
                            download: getLicenseInvoiceUrlAction,
                          }}
                        />
                        {isAdmin && <LicenseKey licenseId={license.id} hasKey={keyLicenseIds.includes(license.id)} />}
                      </div>
                      {used.length === 0 ? (
                        <p className="text-sm text-muted">Brak przypisań tej licencji.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {used.map((a) => {
                            const targetName =
                              license.licenseType === "urzadzenie"
                                ? equipment.find((e) => e.id === a.equipmentId)?.name
                                : (() => {
                                    const emp = employees.find((e) => e.id === a.employeeId);
                                    return emp ? employeeFullName(emp) : undefined;
                                  })();
                            return (
                              <li
                                key={a.id}
                                className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2 text-sm"
                              >
                                <span>{targetName ?? "Nieznany"}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleRemoveAssignment(a.id)}
                                    className="text-muted hover:text-danger"
                                    aria-label="Usuń przypisanie"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {isAdmin && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <select
                            className={inputClass}
                            value={assignTarget}
                            onChange={(e) => setAssignTarget(e.target.value)}
                          >
                            <option value="">
                              {license.licenseType === "urzadzenie"
                                ? "Wybierz urządzenie…"
                                : "Wybierz pracownika…"}
                            </option>
                            {license.licenseType === "urzadzenie"
                              ? equipment.map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.name} ({e.inventoryNumber})
                                  </option>
                                ))
                              : employees.map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {employeeFullName(e)}
                                  </option>
                                ))}
                          </select>
                          <Button
                            variant="secondary"
                            disabled={isPending || free <= 0}
                            onClick={() => handleAssign(license)}
                          >
                            Przypisz
                          </Button>
                        </div>
                      )}
                      {free <= 0 && (
                        <p className="text-xs text-danger">
                          Brak wolnych stanowisk — usuń istniejące przypisanie albo zwiększ
                          liczbę stanowisk tej licencji.
                        </p>
                      )}
                      {assignError && <p className="text-sm text-danger">{assignError}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
