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

export function NowyUzytkownikForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [role, setRole] = useState<"administrator" | "podglad">("podglad");
  const [visibleTabs, setVisibleTabs] = useState<Set<string>>(
    () => new Set(ASSIGNABLE_TABS.map((t) => t.key))
  );

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

  async function onSubmit(values: UserFormValues) {
    setSubmitError(null);
    const result = await createUserAction({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      role,
      visibleTabs: Array.from(visibleTabs),
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
          title="Uprawnienia"
          description="Administrator ma zawsze pełny dostęp do wszystkich zakładek i może edytować dane. Tylko podgląd może jedynie przeglądać dane, bez żadnej możliwości edycji."
        >
          <div className="sm:col-span-2 flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={role === "podglad"}
                onChange={() => setRole("podglad")}
                className="h-4 w-4 text-primary"
              />
              Tylko podgląd
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

          {role === "podglad" && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                Widoczne zakładki
              </p>
              <div className="flex flex-wrap gap-3">
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
            </div>
          )}
        </FormSection>

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
