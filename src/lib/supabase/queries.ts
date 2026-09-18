import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAssignment,
  mapCategory,
  mapEmployee,
  mapEquipment,
  mapEquipmentLink,
  mapInstalledSoftware,
  mapLicenseAssignment,
  mapLocation,
  mapProtocol,
  mapSoftwareLicense,
  mapSoftwareProduct,
} from "./mappers";
import type {
  Category,
  Employee,
  Equipment,
  Assignment,
  EquipmentLink,
  CompanySettings,
  Protocol,
  SoftwareProduct,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  InstalledSoftware,
  Location,
} from "@/lib/types";

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCategory);
}

export async function getLocations(supabase: SupabaseClient): Promise<Location[]> {
  const { data, error } = await supabase.from("locations").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLocation);
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
  return {
    name: data.name,
    address: data.address,
    nip: data.nip,
    representativeName: data.representative_name ?? "",
  };
}

export async function getProtocols(supabase: SupabaseClient): Promise<Protocol[]> {
  const { data, error } = await supabase
    .from("protocols")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProtocol);
}

export async function getProtocolsForEquipment(
  supabase: SupabaseClient,
  equipmentId: string
): Promise<Protocol[]> {
  const { data, error } = await supabase
    .from("protocol_items")
    .select("protocol_id, protocols(*)")
    .eq("equipment_id", equipmentId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => row.protocols)
    .filter((p) => p !== null)
    .map((p) => mapProtocol(p as unknown as Parameters<typeof mapProtocol>[0]))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getSoftwareProducts(supabase: SupabaseClient): Promise<SoftwareProduct[]> {
  const { data, error } = await supabase.from("software_products").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSoftwareProduct);
}

export async function getSoftwareLicenses(supabase: SupabaseClient): Promise<SoftwareLicense[]> {
  const { data, error } = await supabase.from("software_licenses").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSoftwareLicense);
}

export async function getLicenseAssignments(
  supabase: SupabaseClient
): Promise<SoftwareLicenseAssignment[]> {
  const { data, error } = await supabase.from("software_license_assignments").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLicenseAssignment);
}

export async function getInstalledSoftware(supabase: SupabaseClient): Promise<InstalledSoftware[]> {
  const { data, error } = await supabase.from("equipment_installed_software").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapInstalledSoftware);
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
