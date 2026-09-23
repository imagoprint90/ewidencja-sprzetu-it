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
  mapNotificationLogEntry,
  mapNotificationTemplate,
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
  NotificationLogEntry,
  NotificationTemplate,
  Protocol,
  SoftwareProduct,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  InstalledSoftware,
  Location,
} from "@/lib/types";
import type { AppRole } from "@/lib/access";

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
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("first_name")
    .order("last_name");
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

export interface ProtocolItemLink {
  protocolId: string;
  equipmentId: string;
}

// Lekka lista powiązań protokół↔sprzęt (bez pełnych danych protokołów) — do wyliczenia
// "ostatniego protokołu" dla każdej pozycji na liście sprzętu bez N osobnych zapytań.
export async function getProtocolItemLinks(supabase: SupabaseClient): Promise<ProtocolItemLink[]> {
  const { data, error } = await supabase
    .from("protocol_items")
    .select("protocol_id, equipment_id")
    .not("equipment_id", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    protocolId: row.protocol_id,
    equipmentId: row.equipment_id as string,
  }));
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

export async function getNotificationTemplates(
  supabase: SupabaseClient
): Promise<NotificationTemplate[]> {
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotificationTemplate);
}

export async function getNotificationLog(supabase: SupabaseClient): Promise<NotificationLogEntry[]> {
  const { data, error } = await supabase
    .from("notification_log")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotificationLogEntry);
}

export interface CurrentProfile {
  fullName: string;
  role: AppRole;
  visibleTabs: string[] | null;
  visibleCategories: string[] | null;
  canEditEquipment: boolean;
  canTransferEquipment: boolean;
}

export async function getCurrentProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, visible_tabs, visible_categories, can_edit_equipment, can_transfer_equipment")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    fullName: data.full_name,
    role: data.role,
    visibleTabs: data.visible_tabs,
    visibleCategories: data.visible_categories,
    canEditEquipment: data.can_edit_equipment,
    canTransferEquipment: data.can_transfer_equipment,
  };
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string | null;
  role: AppRole;
  visibleTabs: string[] | null;
  visibleCategories: string[] | null;
  canEditEquipment: boolean;
  canTransferEquipment: boolean;
  createdAt: string;
}

// Lista kont aplikacji (zakładka Użytkownicy) — RLS pozwala to odczytać tylko
// administratorowi (patrz polityka "admin zarzadza profilami").
export async function getProfiles(supabase: SupabaseClient): Promise<UserProfile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    visibleTabs: row.visible_tabs,
    visibleCategories: row.visible_categories,
    canEditEquipment: row.can_edit_equipment,
    canTransferEquipment: row.can_transfer_equipment,
    createdAt: row.created_at,
  }));
}
