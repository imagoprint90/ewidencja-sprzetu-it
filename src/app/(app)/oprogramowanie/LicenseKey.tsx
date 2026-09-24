"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Form";
import { getLicenseKeyAction, setLicenseKeyAction } from "@/lib/supabase/actions/software-actions";

// Klucz licencji — tylko dla administratora. Domyślnie ukryty i niepobrany: aplikacja
// pobiera go z bazy dopiero po kliknięciu "Pokaż"/"Kopiuj" (nie jest częścią listy licencji).
export function LicenseKey({ licenseId, hasKey }: { licenseId: string; hasKey: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [key, setKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<string | null> {
    if (key !== null) return key;
    const result = await getLicenseKeyAction(licenseId);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    setKey(result.data.key);
    return result.data.key;
  }

  function handleShow() {
    setError(null);
    if (visible) {
      setVisible(false);
      return;
    }
    startTransition(async () => {
      if ((await load()) !== null) setVisible(true);
    });
  }

  function handleCopy() {
    setError(null);
    startTransition(async () => {
      const value = await load();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Nie udało się skopiować — pokaż klucz i skopiuj ręcznie.");
      }
    });
  }

  function handleEdit() {
    setError(null);
    startTransition(async () => {
      const current = hasKey ? ((await load()) ?? "") : "";
      setDraft(current);
      setEditing(true);
    });
  }

  function handleSave(value: string) {
    startTransition(async () => {
      const result = await setLicenseKeyAction(licenseId, value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setKey(value.trim() || null);
      setVisible(false);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Klucz licencji</p>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {editing ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass + " font-mono"}
            value={draft}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Wklej klucz licencji"
          />
          <Button size="sm" disabled={isPending} onClick={() => handleSave(draft)}>
            Zapisz
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Anuluj
          </Button>
        </div>
      ) : hasKey ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-black/5 px-2 py-1 text-sm">
            {visible && key ? key : "••••••••-••••-••••"}
          </code>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={handleShow}>
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            {visible ? "Ukryj" : "Pokaż"}
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Skopiowano" : "Kopiuj"}
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={handleEdit}>
            Zmień
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleSave("")}>
            <Trash2 size={14} />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" disabled={isPending} onClick={handleEdit}>
          <KeyRound size={14} />
          Dodaj klucz
        </Button>
      )}
    </div>
  );
}
