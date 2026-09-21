"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/access";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Brak zalogowanego użytkownika." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "administrator") {
    return { ok: false, error: "Ta operacja wymaga uprawnień administratora." };
  }

  return { ok: true, supabase, userId: user.id };
}

export async function createUserAction(input: {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
  visibleTabs: string[] | null;
  visibleCategories: string[] | null;
}): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email) return { ok: false, error: "Podaj adres e-mail." };
  if (!fullName) return { ok: false, error: "Podaj imię i nazwisko." };
  if (input.password.length < 8) return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };

  const service = createSupabaseServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "";
    if (message.toLowerCase().includes("already been registered") || message.toLowerCase().includes("already exists")) {
      return { ok: false, error: "Konto z tym adresem e-mail już istnieje." };
    }
    return { ok: false, error: message || "Nie udało się utworzyć konta." };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    role: input.role,
    visible_tabs: input.role === "administrator" ? null : input.visibleTabs,
    visible_categories: input.role === "edycja_podglad" ? input.visibleCategories : null,
  });

  if (profileError) {
    // Sprzątamy po sobie — nie zostawiamy konta logowania bez profilu roli.
    await service.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "Nie udało się zapisać profilu użytkownika. Spróbuj ponownie." };
  }

  revalidatePath("/uzytkownicy");
  return { ok: true, data: { id: created.user.id } };
}

export async function updateUserPermissionsAction(
  id: string,
  input: { role: AppRole; visibleTabs: string[] | null; visibleCategories: string[] | null }
): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (id === guard.userId && input.role !== "administrator") {
    return { ok: false, error: "Nie możesz odebrać uprawnień administratora samemu sobie." };
  }

  const { error } = await guard.supabase
    .from("profiles")
    .update({
      role: input.role,
      visible_tabs: input.role === "administrator" ? null : input.visibleTabs,
      visible_categories: input.role === "edycja_podglad" ? input.visibleCategories : null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Nie udało się zapisać uprawnień." };

  revalidatePath("/uzytkownicy");
  return { ok: true, data: undefined };
}

export async function deleteUserAction(id: string): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (id === guard.userId) {
    return { ok: false, error: "Nie możesz usunąć własnego konta." };
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return { ok: false, error: "Nie udało się usunąć konta." };

  revalidatePath("/uzytkownicy");
  return { ok: true, data: undefined };
}

export async function resetUserPasswordAction(
  id: string,
  newPassword: string
): Promise<ActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  if (newPassword.length < 8) return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };

  const service = createSupabaseServiceClient();
  const { error } = await service.auth.admin.updateUserById(id, { password: newPassword });
  if (error) return { ok: false, error: "Nie udało się zresetować hasła." };

  return { ok: true, data: undefined };
}
