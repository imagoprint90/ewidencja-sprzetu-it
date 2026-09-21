"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userFormSchema, type UserFormValues } from "@/lib/schemas";
import { FormField, FormSection, inputClass } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ASSIGNABLE_TABS } from "@/lib/access";
import { createUserAction } from "@/lib/supabase/actions/user-actions";
import type { Category } from "@/lib/types";

export function NowyUzytkownikForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [role, setRole] = useState<"administrator" | "podglad">("podglad");
  const [visibleTabs, setVisibleTabs] = useState<Set<string>>(
    () => new Set(ASSIGNABLE_TABS.map((t) => t.key))
  );
  const [canEditEquipment, setCanEditEquipment] = useState(false);
  const [canTransferEquipment, setCanTransferEquipment] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
  });

  function toggleTab(key: string) {
    setVisibleTabs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCategory(id: string) {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(values: UserFormValues) {
    setSubmitError(null);
    const result = await createUserAction({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      role,
      visibleTabs: Array.from(visibleTabs),
      canEditEquipment,
      canTransferEquipment,
      visibleCategories: Array.from(visibleCategories),
    });
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    router.push("/uzytkownicy");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dodaj użytkownika</h1>
        <p className="text-sm text-muted">
          Konto zostanie utworzone od razu z podanym hasłem — nowy użytkownik może się nim
          zalogować natychmiast (i później zmienić je przez „Nie pamiętasz hasła?” na stronie
          logowania).
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormSection title="Dane konta">
          <FormField label="Imię i nazwisko" htmlFor="fullName" required error={errors.fullName?.message} full>
            <input id="fullName" className={inputClass} {...register("fullName")} />
          </FormField>
          <FormField label="Adres e-mail" htmlFor="email" required error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register("email")} />
          </FormField>
          <FormField label="Hasło początkowe" htmlFor="password" required error={errors.password?.message}>
            <input id="password" type="password" className={inputClass} {...register("password")} />
          </FormField>
        </FormSection>

        <FormSection
          title="Rola"
          description="Administrator ma zawsze pełny dostęp i może edytować wszystko. Inne konta są domyślnie tylko do odczytu — poniższe uprawnienia dodatkowe można dowolnie łączyć."
        >
          <div className="sm:col-span-2 flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={role === "podglad"}
                onChange={() => setRole("podglad")}
                className="h-4 w-4 text-primary"
              />
              Standardowe konto
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={role === "administrator"}
                onChange={() => setRole("administrator")}
                className="h-4 w-4 text-primary"
              />
              Administrator
            </label>
          </div>
        </FormSection>

        {role === "podglad" && (
          <>
            <FormSection title="Widoczne zakładki">
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                {ASSIGNABLE_TABS.map((t) => (
                  <label key={t.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleTabs.has(t.key)}
                      onChange={() => toggleTab(t.key)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="Uprawnienia dodatkowe"
              description="Można zaznaczyć jedno, oba albo żadne — konto bez zaznaczonych uprawnień jest wyłącznie do odczytu."
            >
              <div className="sm:col-span-2 flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canEditEquipment}
                    onChange={(e) => setCanEditEquipment(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Edycja i podgląd sprzętu — dodawanie, edycja i usuwanie sprzętu, wyłącznie w
                  wybranych niżej kategoriach
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canTransferEquipment}
                    onChange={(e) => setCanTransferEquipment(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Przekazywanie sprzętu — operacja „Przekaż sprzęt” i generowanie protokołów,
                  wgląd i usuwanie własnych wystawionych protokołów
                </label>
              </div>

              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  Kategorie sprzętu do edycji
                </p>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted">Brak kategorii w systemie.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {categories
                      .filter((c) => !c.isArchived)
                      .map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={visibleCategories.has(c.id)}
                            onChange={() => toggleCategory(c.id)}
                            className="h-4 w-4 rounded border-border text-primary"
                          />
                          {c.name}
                        </label>
                      ))}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-muted">
                  To konto widzi w zakładce Protokoły wyłącznie protokoły zawierające sprzęt z
                  zaznaczonych tu kategorii (bez zaznaczonej kategorii nie zobaczy żadnego
                  protokołu). Jeśli włączone jest „Edycja i podgląd sprzętu” powyżej, dodatkowo
                  sprzęt spoza zaznaczonych kategorii nie będzie w ogóle widoczny dla tego konta.
                </p>
              </div>
            </FormSection>
          </>
        )}

        {submitError && (
          <p className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Utwórz konto
          </Button>
        </div>
      </form>
    </div>
  );
}
