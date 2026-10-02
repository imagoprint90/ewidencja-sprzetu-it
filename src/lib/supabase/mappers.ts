import type {
  Assignment,
  Category,
  Department,
  Employee,
  Equipment,
  EquipmentLink,
  InstalledSoftware,
  LicenseType,
  Location,
  NotificationLogEntry,
  NotificationSchedule,
  NotificationStatus,
  NotificationTemplate,
  Protocol,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  SoftwareProduct,
  Ticket,
  TicketAssignableUser,
  TicketAttachment,
  TicketCategory,
  TicketComment,
  TicketHistoryAction,
  TicketHistoryEntry,
} from "@/lib/types";

// Mapowanie wierszy z bazy (snake_case) na typy używane w interfejsie (camelCase).

export function mapCategory(row: {
  id: string;
  name: string;
  is_archived: boolean;
  sort_order?: number | null;
  supports_windows?: boolean | null;
  created_at: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    isArchived: row.is_archived,
    sortOrder: row.sort_order ?? 0,
    supportsWindows: row.supports_windows ?? false,
    createdAt: row.created_at,
  };
}

export function mapLocation(row: {
  id: string;
  name: string;
  is_archived: boolean;
  is_warehouse: boolean;
  created_at: string;
}): Location {
  return {
    id: row.id,
    name: row.name,
    isArchived: row.is_archived,
    isWarehouse: row.is_warehouse,
    createdAt: row.created_at,
  };
}

export function mapEmployee(row: {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  location_id: string | null;
  is_active: boolean;
  created_at: string;
}): Employee {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    departmentId: row.department_id,
    locationId: row.location_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapDepartment(row: {
  id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
}): Department {
  return {
    id: row.id,
    name: row.name,
    isArchived: row.is_archived,
    createdAt: row.created_at,
  };
}

export function mapEquipment(row: {
  id: string;
  inventory_number: string;
  category_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  technical_condition: Equipment["technicalCondition"];
  purchase_price: number | string | null;
  in_domain: boolean;
  has_openvpn: boolean;
  has_forticlient: boolean;
  windows_edition?: Equipment["windowsEdition"];
  status: Equipment["status"];
  location_id: string | null;
  last_holder_id?: string | null;
  last_holder_name?: string | null;
  notes: string | null;
  purchase_invoice_path: string | null;
  created_at: string;
  updated_at: string;
}): Equipment {
  return {
    id: row.id,
    inventoryNumber: row.inventory_number,
    categoryId: row.category_id,
    name: row.name,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    warrantyEnd: row.warranty_end,
    technicalCondition: row.technical_condition,
    purchasePrice: row.purchase_price === null ? null : Number(row.purchase_price),
    inDomain: row.in_domain,
    hasOpenvpn: row.has_openvpn,
    hasForticlient: row.has_forticlient,
    windowsEdition: row.windows_edition ?? null,
    status: row.status,
    locationId: row.location_id,
    lastHolderId: row.last_holder_id ?? null,
    lastHolderName: row.last_holder_name ?? null,
    notes: row.notes,
    purchaseInvoicePath: row.purchase_invoice_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssignment(row: {
  id: string;
  equipment_id: string;
  employee_id: string;
  assigned_at: string;
  returned_at: string | null;
  assigned_condition: Assignment["assignedCondition"];
  returned_condition: Assignment["returnedCondition"];
  notes: string | null;
  created_at: string;
}): Assignment {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    employeeId: row.employee_id,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at,
    assignedCondition: row.assigned_condition,
    returnedCondition: row.returned_condition,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapProtocol(row: {
  id: string;
  protocol_number: string;
  type: Protocol["type"];
  issued_by: string | null;
  issued_by_name: string;
  issued_at: string;
  city: string;
  snapshot: Protocol["snapshot"];
  pdf_status: Protocol["pdfStatus"];
  pdf_path: string | null;
  pdf_error: string | null;
  signed_scan_path: string | null;
  created_at: string;
}): Protocol {
  return {
    id: row.id,
    protocolNumber: row.protocol_number,
    type: row.type,
    issuedBy: row.issued_by,
    issuedByName: row.issued_by_name,
    issuedAt: row.issued_at,
    city: row.city,
    snapshot: row.snapshot,
    pdfStatus: row.pdf_status,
    pdfPath: row.pdf_path,
    pdfError: row.pdf_error,
    signedScanPath: row.signed_scan_path,
    createdAt: row.created_at,
  };
}

export function mapSoftwareProduct(row: {
  id: string;
  name: string;
  version: string | null;
  notes: string | null;
}): SoftwareProduct {
  return { id: row.id, name: row.name, version: row.version, notes: row.notes };
}

export function mapSoftwareLicense(row: {
  id: string;
  product_id: string;
  license_type: LicenseType;
  seats_total: number;
  valid_until: string | null;
  purchase_date: string | null;
  invoice_path: string | null;
  notes: string | null;
}): SoftwareLicense {
  return {
    id: row.id,
    productId: row.product_id,
    licenseType: row.license_type,
    seatsTotal: row.seats_total,
    validUntil: row.valid_until,
    purchaseDate: row.purchase_date,
    invoicePath: row.invoice_path,
    notes: row.notes,
  };
}

export function mapLicenseAssignment(row: {
  id: string;
  license_id: string;
  equipment_id: string | null;
  employee_id: string | null;
  assigned_at: string;
}): SoftwareLicenseAssignment {
  return {
    id: row.id,
    licenseId: row.license_id,
    equipmentId: row.equipment_id,
    employeeId: row.employee_id,
    assignedAt: row.assigned_at,
  };
}

export function mapInstalledSoftware(row: {
  id: string;
  equipment_id: string;
  software_product_id: string;
  installed_at: string;
  notes: string | null;
}): InstalledSoftware {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    softwareProductId: row.software_product_id,
    installedAt: row.installed_at,
    notes: row.notes,
  };
}

export function mapEquipmentLink(row: {
  id: string;
  equipment_id: string;
  linked_equipment_id: string;
}): EquipmentLink {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    linkedEquipmentId: row.linked_equipment_id,
  };
}

export function mapNotificationTemplate(row: {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}): NotificationTemplate {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotificationLogEntry(row: {
  id: string;
  employee_id: string | null;
  employee_name_snapshot: string;
  employee_email_snapshot: string;
  template_id: string | null;
  template_name_snapshot: string | null;
  subject: string;
  body: string;
  status: NotificationStatus;
  error_message: string | null;
  sent_by: string | null;
  sent_by_name: string;
  schedule_id: string | null;
  created_at: string;
}): NotificationLogEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name_snapshot,
    employeeEmail: row.employee_email_snapshot,
    templateId: row.template_id,
    templateName: row.template_name_snapshot,
    subject: row.subject,
    body: row.body,
    status: row.status,
    errorMessage: row.error_message,
    sentBy: row.sent_by,
    sentByName: row.sent_by_name,
    scheduleId: row.schedule_id,
    createdAt: row.created_at,
  };
}

export function mapNotificationSchedule(row: {
  id: string;
  name: string;
  template_id: string;
  employee_ids: string[];
  send_time: string;
  days_of_week: number[];
  is_active: boolean;
  last_sent_date: string | null;
  created_at: string;
  updated_at: string;
}): NotificationSchedule {
  return {
    id: row.id,
    name: row.name,
    templateId: row.template_id,
    employeeIds: row.employee_ids,
    // Postgres "time" zwraca "HH:MM:SS" — tu przycinamy do "HH:MM" na potrzeby UI.
    sendTime: row.send_time.slice(0, 5),
    daysOfWeek: row.days_of_week,
    isActive: row.is_active,
    lastSentDate: row.last_sent_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTicketCategory(row: {
  id: string;
  name: string;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}): TicketCategory {
  return {
    id: row.id,
    name: row.name,
    isArchived: row.is_archived,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function mapTicket(row: {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  category_id: string | null;
  status: Ticket["status"];
  priority: Ticket["priority"];
  created_by: string;
  created_by_name: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  first_assigned_at: string | null;
  last_assignee_changed_at: string | null;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  is_archived: boolean;
}): Ticket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    createdAt: row.created_at,
    firstAssignedAt: row.first_assigned_at,
    lastAssigneeChangedAt: row.last_assignee_changed_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    isArchived: row.is_archived,
  };
}

export function mapTicketComment(row: {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}): TicketComment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapTicketHistoryEntry(row: {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: TicketHistoryAction;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  happened_at: string;
}): TicketHistoryEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    happenedAt: row.happened_at,
  };
}

export function mapTicketAssignableUser(row: { id: string; full_name: string }): TicketAssignableUser {
  return { id: row.id, fullName: row.full_name };
}

export function mapTicketAttachment(row: {
  id: string;
  ticket_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}): TicketAttachment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    contentType: row.content_type,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
  };
}
