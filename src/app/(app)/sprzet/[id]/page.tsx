"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { DetailsTab } from "@/components/equipment/tabs/DetailsTab";
import { AssignmentsTab } from "@/components/equipment/tabs/AssignmentsTab";
import { SoftwareTab } from "@/components/equipment/tabs/SoftwareTab";
import { LinkedEquipmentTab } from "@/components/equipment/tabs/LinkedEquipmentTab";
import { DocumentsTab } from "@/components/equipment/tabs/DocumentsTab";
import { HistoryTab } from "@/components/equipment/tabs/HistoryTab";
import { getCategoryName } from "@/lib/equipment-helpers";
import { Button } from "@/components/ui/Button";

export default function SprzetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { equipment, categories } = useStore();
  const item = equipment.find((e) => e.id === params.id);

  if (!item) {
    return (
      <EmptyState
        title="Nie znaleziono sprzętu"
        description="Sprzęt o podanym identyfikatorze nie istnieje lub został usunięty z widoku demonstracyjnego."
        action={
          <Link href="/sprzet">
            <Button variant="secondary">Wróć do listy sprzętu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Wróć
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <p className="text-sm text-muted">
            {item.inventoryNumber} · {getCategoryName(categories, item.categoryId)}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <Tabs
        tabs={[
          { key: "szczegoly", label: "Szczegóły", content: <DetailsTab equipment={item} /> },
          { key: "przydzialy", label: "Przydziały", content: <AssignmentsTab equipment={item} /> },
          { key: "oprogramowanie", label: "Oprogramowanie", content: <SoftwareTab /> },
          {
            key: "powiazany",
            label: "Powiązany sprzęt",
            content: <LinkedEquipmentTab equipment={item} />,
          },
          { key: "dokumenty", label: "Dokumenty", content: <DocumentsTab /> },
          { key: "historia", label: "Historia zmian", content: <HistoryTab equipment={item} /> },
        ]}
      />
    </div>
  );
}
