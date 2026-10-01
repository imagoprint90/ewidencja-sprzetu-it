import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAssignment,
  mapCategory,
  mapDepartment,
  mapEmployee,
  mapEquipment,
  mapEquipmentLink,
  mapInstalledSoftware,
  mapLicenseAssignment,
  mapLocation,
  mapNotificationLogEntry,
  mapNotificationSchedule,
  mapNotificationTemplate,
  mapProtocol,
  mapSoftwareLicense,
  mapSoftwareProduct,
  mapTicket,
  mapTicketAssignableUser,
  mapTicketCategory,
  mapTicketComment,
  mapTicketHistoryEntry,
} from "./mappers";
import type {
  Category,
  Department,
  Employee,
  Equipment,
  Assignment,
  EquipmentLink,
  CompanySettings,
  NotificationLogEntry,
  NotificationSchedule,
  NotificationTemplate,
  Protocol,
  SoftwareProduct,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  InstalledSoftware,
  Location,
  LicenseHistoryEntry,
  EquipmentStatusDef,
  LastProtocolInfo,
  Ticket,
  TicketAssignableUser,
  TicketCategory,
  TicketComment,
  TicketHistoryEntry,
} from "@/lib/types";
import { DEFAULT_EQUIPMENT_STATUSES } from "@/lib/types";
import type { AppRole, TicketPermissions } from "@/lib/access";

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const ordered = await supabase.from("categories").select("*").order("sort_order").order("name");
  if (!ordered.error) return (ordered.data ?? []).map(mapCategory);
  // Migracja 0035 (kolumna sort_order) mogła nie zostać jeszcze uruchomiona — wtedy sortujemy po nazwie.
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCategory);
}

export async function getDepartments(supabase: SupabaseClient): Promise<Department[]> {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDepartment);
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

// Tylko aktywne przydziały (bez historii) — lista Sprzęt nie potrzebuje reszty, a historia rośnie.
export async function getActiveAssignments(supabase: SupabaseClient): Promise<Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*").is("returned_at", null);
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

// Ostatni protokół każdej pozycji sprzętu, liczony po stronie bazy (migracja 0047) —
// zamiast ściągać do przeglądarki pełną historię wszystkich protokołów (rosnącą bez końca),
// pobiera tylko jeden, najnowszy wiersz na sprzęt. Używane na liście Sprzęt.
export async function getLastProtocolsForEquipment(
  supabase: SupabaseClient
): Promise<Record<string, LastProtocolInfo>> {
  const { data, error } = await supabase.rpc("equipment_last_protocols");
  // Funkcja z migracji 0047 może jeszcze nie istnieć — wtedy kolumny "Ostatni protokół" i
  // "Stan techniczny" po prostu zostają puste, zamiast wywalać całą listę sprzętu.
  if (error || !data) return {};
  const result: Record<string, LastProtocolInfo> = {};
  for (const row of data as {
    equipment_id: string;
    protocol_id: string;
    protocol_number: string;
    pdf_status: string;
    pdf_path: string | null;
    created_at: string;
    condition: string | null;
  }[]) {
    result[row.equipment_id] = {
      id: row.protocol_id,
      protocolNumber: row.protocol_number,
      pdfStatus: row.pdf_status as LastProtocolInfo["pdfStatus"],
      pdfPath: row.pdf_path,
      createdAt: row.created_at,
      condition: row.condition,
    };
  }
  return result;
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

export async function getLicenseHistory(supabase: SupabaseClient): Promise<LicenseHistoryEntry[]> {
  const { data, error } = await supabase
    .from("license_assignment_history")
    .select("*")
    .order("happened_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    licenseId: r.license_id,
    productName: r.product_name,
    licenseType: r.license_type,
    action: r.action,
    equipmentName: r.equipment_name,
    employeeName: r.employee_name,
    actorName: r.actor_name,
    happenedAt: r.happened_at,
  }));
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

export async function getNotificationSchedules(
  supabase: SupabaseClient
): Promise<NotificationSchedule[]> {
  const { data, error } = await supabase
    .from("notification_schedules")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotificationSchedule);
}

const TICKET_PERMISSION_COLUMNS =
  "can_create_tickets, can_view_own_tickets, can_view_assigned_tickets, can_view_all_tickets, can_edit_tickets, can_comment_tickets, can_change_ticket_status, can_change_ticket_priority, can_assign_tickets, can_close_tickets, can_admin_tickets, visible_ticket_categories";

// Wiersz profiles zawiera te same kolumny niezależnie od tego, czy to CurrentProfile czy
// UserProfile — jedno miejsce, żeby nie powielać mapowania 11 flag ticketów w dwóch funkcjach.
function mapTicketPermissionsRow(row: {
  can_create_tickets: boolean;
  can_view_own_tickets: boolean;
  can_view_assigned_tickets: boolean;
  can_view_all_tickets: boolean;
  can_edit_tickets: boolean;
  can_comment_tickets: boolean;
  can_change_ticket_status: boolean;
  can_change_ticket_priority: boolean;
  can_assign_tickets: boolean;
  can_close_tickets: boolean;
  can_admin_tickets: boolean;
  visible_ticket_categories: string[] | null;
}): TicketPermissions {
  return {
    canCreate: row.can_create_tickets,
    canViewOwn: row.can_view_own_tickets,
    canViewAssigned: row.can_view_assigned_tickets,
    canViewAll: row.can_view_all_tickets,
    canEdit: row.can_edit_tickets,
    canComment: row.can_comment_tickets,
    canChangeStatus: row.can_change_ticket_status,
    canChangePriority: row.can_change_ticket_priority,
    canAssign: row.can_assign_tickets,
    canClose: row.can_close_tickets,
    canAdmin: row.can_admin_tickets,
    visibleTicketCategories: row.visible_ticket_categories,
  };
}

export interface CurrentProfile {
  fullName: string;
  role: AppRole;
  visibleTabs: string[] | null;
  visibleCategories: string[] | null;
  canEditEquipment: boolean;
  canTransferEquipment: boolean;
  ticketPermissions: TicketPermissions;
}

export async function getCurrentProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `full_name, role, visible_tabs, visible_categories, can_edit_equipment, can_transfer_equipment, ${TICKET_PERMISSION_COLUMNS}`
    )
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
    ticketPermissions: mapTicketPermissionsRow(data),
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
  ticketPermissions: TicketPermissions;
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
    ticketPermissions: mapTicketPermissionsRow(row),
    createdAt: row.created_at,
  }));
}

export async function getEquipmentStatuses(supabase: SupabaseClient): Promise<EquipmentStatusDef[]> {
  const { data, error } = await supabase
    .from("equipment_statuses")
    .select("*")
    .order("sort_order")
    .order("label");
  // Brak tabeli (migracja 0039 jeszcze nie uruchomiona) albo pusty słownik — statusy domyślne.
  if (error || !data || data.length === 0) return DEFAULT_EQUIPMENT_STATUSES;
  return data.map((row) => ({
    key: row.key,
    label: row.label,
    textColor: row.text_color,
    backgroundColor: row.background_color,
    textColorDark: row.text_color_dark ?? null,
    backgroundColorDark: row.background_color_dark ?? null,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
  }));
}

// ------------------------------------------------------------------------------------------
// Moduł Tickety
// ------------------------------------------------------------------------------------------

export async function getTicketCategories(supabase: SupabaseClient): Promise<TicketCategory[]> {
  const { data, error } = await supabase
    .from("ticket_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTicketCategory);
}

// RLS filtruje wynik wg uprawnień (własne/przydzielone/wszystkie w dostępnych kategoriach) —
// patrz polityka "odczyt ticketow wg uprawnien" w migracji 0051.
export async function getTickets(supabase: SupabaseClient): Promise<Ticket[]> {
  const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTicket);
}

export async function getTicketById(supabase: SupabaseClient, id: string): Promise<Ticket | null> {
  const { data, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapTicket(data) : null;
}

export async function getTicketComments(supabase: SupabaseClient, ticketId: string): Promise<TicketComment[]> {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTicketComment);
}

export async function getTicketHistory(supabase: SupabaseClient, ticketId: string): Promise<TicketHistoryEntry[]> {
  const { data, error } = await supabase
    .from("ticket_history")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("happened_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTicketHistoryEntry);
}

// Konta, którym można przydzielić ticket — RPC (SECURITY DEFINER), bo zwykłe RLS na profiles
// nie pozwala odczytać cudzych wierszy (patrz komentarz w migracji 0051).
export async function getTicketAssignableUsers(supabase: SupabaseClient): Promise<TicketAssignableUser[]> {
  const { data, error } = await supabase.rpc("list_ticket_assignable_users");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTicketAssignableUser);
}