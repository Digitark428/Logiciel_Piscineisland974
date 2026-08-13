/**
 * Types métier (miroir du schéma SQL). Écrits à la main pour rester lisibles
 * et sans dépendance de génération. À maintenir avec les migrations.
 */

export type WorkspaceStatus = "active" | "disabled";
export type MemberRole = "admin" | "member";
export type MemberType = "employe" | "prestataire" | "stagiaire" | "alternant";
export type MemberStatus = "active" | "disabled";
export type ClientStatus = "active" | "archived";
export type ServiceKind = "unique" | "recurring";
export type ServiceStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type SeriesMode = "frequency" | "manual";
export type Frequency = "weekly" | "biweekly" | "monthly" | "custom";
export type TaskCategory = "professional" | "personal";
export type TaskStatus = "todo" | "in_progress" | "done";
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";
export type ContractStatus = "draft" | "active" | "archived";

export interface Workspace {
  id: string;
  company_code: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  siret: string | null;
  vat_number: string | null;
  legal_form: string | null;
  legal_info: Record<string, unknown>;
  settings: Record<string, unknown>;
  status: WorkspaceStatus;
  is_demo: boolean;
  plan: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  member_type: MemberType;
  status: MemberStatus;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  photo_path: string | null;
  job_title: string | null;
  professional_info: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  access_info: string | null;
  notes: string | null;
  extra: Record<string, unknown>;
  private_code_hash: string | null;
  private_code_set_at: string | null;
  portal_token: string | null;
  portal_enabled: boolean;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface Pool {
  id: string;
  workspace_id: string;
  client_id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  pool_type: string | null;
  volume_m3: number | null;
  length_m: number | null;
  width_m: number | null;
  depth_m: number | null;
  water_treatment: string | null;
  equipment: Record<string, unknown>;
  technical_notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceSeries {
  id: string;
  workspace_id: string;
  client_id: string;
  pool_id: string | null;
  service_type: string | null;
  mode: SeriesMode;
  frequency: Frequency | null;
  day_of_month: number | null;
  interval_count: number | null;
  default_time: string | null;
  default_duration_min: number | null;
  assigned_membership_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  workspace_id: string;
  code: string;
  client_id: string;
  pool_id: string | null;
  series_id: string | null;
  service_type: string | null;
  kind: ServiceKind;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_min: number | null;
  assigned_membership_id: string | null;
  status: ServiceStatus;
  notes: string | null;
  report: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceTask {
  id: string;
  workspace_id: string;
  service_id: string;
  label: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  due_date: string | null;
  assigned_membership_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  workspace_id: string;
  client_id: string;
  title: string;
  reference: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number | null;
  status: ContractStatus;
  notes: string | null;
  document_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  client_id: string;
  service_id: string | null;
  number: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  workspace_id: string;
  invoice_id: string;
  label: string;
  quantity: number;
  unit_price: number;
  position: number;
}

export interface DocumentRow {
  id: string;
  workspace_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  entity_type: string;
  entity_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  workspace_id: string;
  recipient_membership_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  actor_membership_id: string | null;
  actor_label: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Backup {
  id: string;
  workspace_id: string;
  storage_path: string | null;
  kind: "auto" | "manual";
  size_bytes: number | null;
  status: "running" | "completed" | "failed";
  created_at: string;
}
