import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceStatus } from "@/lib/db/types";
import { clientName, memberName } from "@/lib/utils/format";
import { serviceTypeLabel } from "@/lib/services/constants";
import { weeklyDatesInRange, weeklyOccurrenceKey } from "@/lib/services/recurrence";

export interface OccurrenceClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  access_info: string | null;
}

export interface OccurrenceAssignee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  job_title: string | null;
  photo_path: string | null;
}

export interface OccurrencePool {
  id: string;
  name: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MaintenanceOccurrence {
  key: string;
  id: string | null;
  code: string | null;
  virtual: boolean;
  kind: "one_off" | "recurring";
  seriesId: string | null;
  occurrenceDate: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: ServiceStatus;
  serviceType: string;
  assignedMembershipId: string | null;
  client: OccurrenceClient;
  pool: OccurrencePool | null;
  assignee: OccurrenceAssignee | null;
  notes: string | null;
  report: string | null;
  contractNotes: string | null;
  contractDocumentId: string | null;
  invoiceDocumentId: string | null;
}

interface SeriesRow {
  id: string;
  client_id: string;
  service_type: string | null;
  recurrence_weekday: number;
  starts_on: string;
  ends_on: string | null;
  assigned_membership_id: string | null;
  notes: string | null;
  contract_document_id: string | null;
  invoice_document_id: string | null;
  client: OccurrenceClient | OccurrenceClient[] | null;
  assignee: OccurrenceAssignee | OccurrenceAssignee[] | null;
}

interface ServiceRow {
  id: string;
  code: string;
  kind: "unique" | "recurring";
  series_id: string | null;
  occurrence_date: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: ServiceStatus;
  service_type: string | null;
  assigned_membership_id: string | null;
  notes: string | null;
  report: string | null;
  contract_document_id: string | null;
  invoice_document_id: string | null;
  client: OccurrenceClient | OccurrenceClient[] | null;
  pool: OccurrencePool | OccurrencePool[] | null;
  assignee: OccurrenceAssignee | OccurrenceAssignee[] | null;
  series: { notes: string | null } | Array<{ notes: string | null }> | null;
}

const CLIENT_SELECT = "id,first_name,last_name,company_name,phone,address_line1,postal_code,city,latitude,longitude,access_info";
const ASSIGNEE_SELECT = "id,first_name,last_name,email,role,job_title,photo_path";
const POOL_SELECT = "id,name,address_line1,postal_code,city,latitude,longitude";

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fromService(row: ServiceRow): MaintenanceOccurrence | null {
  const client = relationOne(row.client);
  if (!client) return null;
  const occurrenceDate = row.occurrence_date ?? row.scheduled_date;
  return {
    key: row.id,
    id: row.id,
    code: row.code,
    virtual: false,
    kind: row.kind === "unique" ? "one_off" : "recurring",
    seriesId: row.series_id,
    occurrenceDate,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    status: row.status,
    serviceType: serviceTypeLabel(row.service_type),
    assignedMembershipId: row.assigned_membership_id,
    client,
    pool: relationOne(row.pool),
    assignee: relationOne(row.assignee),
    notes: row.notes,
    report: row.report,
    contractNotes: relationOne(row.series)?.notes ?? null,
    contractDocumentId: row.contract_document_id,
    invoiceDocumentId: row.invoice_document_id,
  };
}

function fromSeries(row: SeriesRow, occurrenceDate: string): MaintenanceOccurrence | null {
  const client = relationOne(row.client);
  if (!client) return null;
  return {
    key: weeklyOccurrenceKey(row.id, occurrenceDate),
    id: null,
    code: null,
    virtual: true,
    kind: "recurring",
    seriesId: row.id,
    occurrenceDate,
    scheduledDate: occurrenceDate,
    scheduledTime: null,
    status: "planned",
    serviceType: serviceTypeLabel(row.service_type),
    assignedMembershipId: row.assigned_membership_id,
    client,
    pool: null,
    assignee: relationOne(row.assignee),
    notes: null,
    report: null,
    contractNotes: row.notes,
    contractDocumentId: row.contract_document_id,
    invoiceDocumentId: row.invoice_document_id,
  };
}

export function occurrenceHref(occurrence: Pick<MaintenanceOccurrence, "id" | "seriesId" | "occurrenceDate">): string {
  return occurrence.id
    ? `/app/services/${occurrence.id}`
    : `/app/services/occurrence/${occurrence.seriesId}/${occurrence.occurrenceDate}`;
}

export async function getMaintenanceOccurrences(
  supabase: SupabaseClient,
  input: { workspaceId: string; start: string; end: string; assignedMembershipId?: string; clientId?: string },
): Promise<MaintenanceOccurrence[]> {
  let seriesQuery = supabase
    .from("service_series")
    .select(`id,client_id,service_type,recurrence_weekday,starts_on,ends_on,assigned_membership_id,notes,contract_document_id,invoice_document_id,client:clients(${CLIENT_SELECT}),assignee:memberships!service_series_assigned_membership_id_fkey(${ASSIGNEE_SELECT})`)
    .eq("workspace_id", input.workspaceId)
    .eq("recurrence_kind", "weekly_contract")
    .neq("status", "paused")
    .lte("starts_on", input.end)
    .or(`ends_on.is.null,ends_on.gte.${input.start}`);

  let serviceQuery = supabase
    .from("services")
    .select(`id,code,kind,series_id,occurrence_date,scheduled_date,scheduled_time,status,service_type,assigned_membership_id,notes,report,contract_document_id,invoice_document_id,client:clients(${CLIENT_SELECT}),pool:pools(${POOL_SELECT}),assignee:memberships!services_assigned_membership_id_fkey(${ASSIGNEE_SELECT}),series:service_series(notes)`)
    .eq("workspace_id", input.workspaceId)
    .or(`and(scheduled_date.gte.${input.start},scheduled_date.lte.${input.end}),and(occurrence_date.gte.${input.start},occurrence_date.lte.${input.end})`);

  if (input.assignedMembershipId) {
    seriesQuery = seriesQuery.eq("assigned_membership_id", input.assignedMembershipId);
    serviceQuery = serviceQuery.eq("assigned_membership_id", input.assignedMembershipId);
  }
  if (input.clientId) {
    seriesQuery = seriesQuery.eq("client_id", input.clientId);
    serviceQuery = serviceQuery.eq("client_id", input.clientId);
  }

  const [seriesResult, serviceResult] = await Promise.all([seriesQuery, serviceQuery]);
  if (seriesResult.error) throw new Error(`Lecture des contrats impossible: ${seriesResult.error.message}`);
  if (serviceResult.error) throw new Error(`Lecture des entretiens impossible: ${serviceResult.error.message}`);

  const seriesRows = (seriesResult.data ?? []) as unknown as SeriesRow[];
  const serviceRows = (serviceResult.data ?? []) as unknown as ServiceRow[];
  const materialized = serviceRows.map(fromService).filter((item): item is MaintenanceOccurrence => Boolean(item));
  const overrideByOccurrence = new Map<string, MaintenanceOccurrence>();
  for (const occurrence of materialized) {
    if (occurrence.seriesId) {
      overrideByOccurrence.set(weeklyOccurrenceKey(occurrence.seriesId, occurrence.occurrenceDate), occurrence);
    }
  }

  const output: MaintenanceOccurrence[] = [];
  const usedMaterializedIds = new Set<string>();
  for (const series of seriesRows) {
    const dates = weeklyDatesInRange(series, input.start, input.end);
    for (const occurrenceDate of dates) {
      const override = overrideByOccurrence.get(weeklyOccurrenceKey(series.id, occurrenceDate));
      if (override) {
        if (override.scheduledDate >= input.start && override.scheduledDate <= input.end) output.push(override);
        if (override.id) usedMaterializedIds.add(override.id);
      } else {
        const virtual = fromSeries(series, occurrenceDate);
        if (virtual) output.push(virtual);
      }
    }
  }

  for (const occurrence of materialized) {
    if (!occurrence.id || usedMaterializedIds.has(occurrence.id)) continue;
    if (occurrence.scheduledDate >= input.start && occurrence.scheduledDate <= input.end) output.push(occurrence);
  }

  return output.sort((left, right) => {
    const dateOrder = left.scheduledDate.localeCompare(right.scheduledDate);
    if (dateOrder !== 0) return dateOrder;
    const timeOrder = (left.scheduledTime ?? "").localeCompare(right.scheduledTime ?? "");
    if (timeOrder !== 0) return timeOrder;
    return clientName(left.client).localeCompare(clientName(right.client), "fr");
  });
}

export async function getWeeklyOccurrenceDetail(
  supabase: SupabaseClient,
  input: { workspaceId: string; seriesId: string; occurrenceDate: string },
): Promise<MaintenanceOccurrence | null> {
  const occurrences = await getMaintenanceOccurrences(supabase, {
    workspaceId: input.workspaceId,
    start: input.occurrenceDate,
    end: input.occurrenceDate,
  });
  const inRange = occurrences.find((item) => item.seriesId === input.seriesId && item.occurrenceDate === input.occurrenceDate);
  if (inRange) return inRange;

  // Une exception peut déplacer scheduled_date hors de la date nominale. Le
  // lien virtuel reste alors résolvable grâce à occurrence_date.
  const { data } = await supabase
    .from("services")
    .select(`id,code,kind,series_id,occurrence_date,scheduled_date,scheduled_time,status,service_type,assigned_membership_id,notes,report,contract_document_id,invoice_document_id,client:clients(${CLIENT_SELECT}),pool:pools(${POOL_SELECT}),assignee:memberships!services_assigned_membership_id_fkey(${ASSIGNEE_SELECT}),series:service_series(notes)`)
    .eq("workspace_id", input.workspaceId)
    .eq("series_id", input.seriesId)
    .eq("occurrence_date", input.occurrenceDate)
    .maybeSingle();
  return data ? fromService(data as unknown as ServiceRow) : null;
}

export function occurrenceAssigneeName(occurrence: MaintenanceOccurrence): string {
  return occurrence.assignee ? memberName(occurrence.assignee) : "Non assigné";
}
