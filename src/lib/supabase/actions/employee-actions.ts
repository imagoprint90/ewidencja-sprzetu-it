"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEmployee } from "@/lib/supabase/mappers";
import type { Employee } from "@/lib/types";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function addEmployeeAction(input: {
  fullName: string;
  email: string | null;
  department: string;
  location: string;
}): Promise<ActionResult<Employee>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email,
      department: input.department.trim(),
      location: input.location.trim(),
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Nie udało się dodać pracownika. Spróbuj ponownie." };
  }

  revalidatePath("/pracownicy");
  return { ok: true, data: mapEmployee(data) };
}

export async function updateEmployeeAction(
  id: string,
  input: { fullName: string; email: string | null; department: string; location: string }
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.fullName.trim(),
      email: input.email,
      department: input.department.trim(),
      location: input.location.trim(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Nie udało się zapisać zmian." };
  }

  revalidatePath("/pracownicy");
  revalidatePath(`/pracownicy/${id}`);
  return { ok: true, data: undefined };
}

export async function setEmployeeActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<undefined>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Nie udało się zmienić statusu pracownika." };
  }

  revalidatePath("/pracownicy");
  revalidatePath(`/pracownicy/${id}`);
  return { ok: true, data: undefined };
}
