import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAssignment,
  mapCategory,
  mapEmployee,
  mapEquipment,
  mapEquipmentLink,
} from "./mappers";
import type { Category, Employee, Equipment, Assignment, EquipmentLink, CompanySettings } from "@/lib/types";

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCategory);
}

export async function getEmployees(supabase: SupabaseClient): Promise<Employee[]> {
  const { data, error } = await supabase.from("employees").select("*").order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEmployee);
}

export async function getEquipment(supabase: SupabaseClient): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("inventory_number");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEquipment);
}

export async function getAssignments(supabase: SupabaseClient): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("assigned_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAssignment);
}

export async function getEquipmentLinks(supabase: SupabaseClient): Promise<EquipmentLink[]> {
  const { data, error } = await supabase.from("equipment_links").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEquipmentLink);
}

export async function getCompanySettings(supabase: SupabaseClient): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw new Error(error.message);
  return { name: data.name, address: data.address, nip: data.nip };
}

export interface CurrentProfile {
  fullName: string;
  role: "administrator" | "podglad";
}

export async function getCurrentProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { fullName: data.full_name, role: data.role };
}
