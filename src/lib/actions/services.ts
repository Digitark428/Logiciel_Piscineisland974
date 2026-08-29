"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionContext, logActivity, notify } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { can, type SessionContext } from "@/lib/auth/context";
import type { ServiceStatus } from "@/lib/db/types";
import { MAINTENANCE_TYPES } from "@/lib/services/constants";
import { weeklyDatesInRange } from "@/lib/services/recurrence";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyToCents } from "@/lib/utils/money";
import { dateOnlyToUtcDate, todayInReunion } from "@/lib/utils/date";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const allowedServiceTypes = new Set<string>(MAINTENANCE_TYPES.map((type) => type.key));

const str = (value: FormDataEntryValue | null): string | null => {
  const text = (value as string | null)?.trim();
  return text || null;
};

function validDate(value: string | null): value is string {
  return Boolean(value && dateSchema.safeParse(value).success && dateOnlyToUtcDate(value));
}

function serviceType(value: FormDataEntryValue | null): string | null {
  const parsed = str(value);
  return parsed && allowedServiceTypes.has(parsed) ? parsed : null;
}

function readFinancialAmount(formData: FormData): { cents: number | null; message?: string } {
  const raw = str(formData.get("amount"));
  if (!raw) return { cents: null };
  const cents = parseMoneyToCents(raw);
  if (cents === null) return { cents: null, message: "Saisissez un montant valide, par exemple 200 ou 200,50." };
  return { cents };
}

async function saveFinancialAmount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    workspaceId: string;
    clientId: string;
    serviceId: string | null;
    serviceSeriesId: string | null;
    amountCents: number;
  },
): Promise<string | null> {
  const targetColumn = input.serviceId ? "service_id" : "service_series_id";
  const targetId = input.serviceId ?? input.serviceSeriesId;
  if (!targetId) return "L'entretien est introuvable.";

  const { data: existing, error: selectError } = await supabase
    .from("service_financials")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq(targetColumn, targetId)
    .maybeSingle();
  if (selectError) return "La valeur financière est inaccessible.";

  const payload = {
    workspace_id: input.workspaceId,
    client_id: input.clientId,
    financial_kind: input.serviceId ? "one_off" : "monthly_contract",
    service_id: input.serviceId,
    service_series_id: input.serviceSeriesId,
    amount_cents: input.amountCents,
  };
  const { error } = existing
    ? await supabase.from("service_financials").update({ amount_cents: input.amountCents }).eq("id", existing.id)
    : await supabase.from("service_financials").insert(payload);
  return error ? "Enregistrement du montant impossible." : null;
}

interface ServiceReferences {
  clientId: string;
  assignedId?: string | null;
  contractDocumentId?: string | null;
  invoiceDocumentId?: string | null;
}

async function validateServiceReferences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  refs: ServiceReferences,
): Promise<boolean> {
  if (!uuidSchema.safeParse(refs.clientId).success) return false;
  const [client, assignee, contractDocument, invoiceDocument] = await Promise.all([
    supabase.from("clients").select("id").eq("id", refs.clientId).eq("workspace_id", workspaceId).maybeSingle(),
    refs.assignedId
      ? supabase.from("memberships").select("id").eq("id", refs.assignedId).eq("workspace_id", workspaceId).eq("status", "active").maybeSingle()
      : Promise.resolve({ data: { id: "not-required" } }),
    refs.contractDocumentId
      ? supabase.from("documents").select("id").eq("id", refs.contractDocumentId).eq("workspace_id", workspaceId).eq("entity_type", "client").eq("entity_id", refs.clientId).eq("category", "contract").maybeSingle()
      : Promise.resolve({ data: { id: "not-required" } }),
    refs.invoiceDocumentId
      ? supabase.from("documents").select("id").eq("id", refs.invoiceDocumentId).eq("workspace_id", workspaceId).eq("entity_type", "client").eq("entity_id", refs.clientId).eq("category", "invoice").maybeSingle()
      : Promise.resolve({ data: { id: "not-required" } }),
  ]);
  return [client, assignee, contractDocument, invoiceDocument].every((result) => Boolean(result.data));
}

function revalidateMaintenance(clientId?: string | null, serviceId?: string | null, seriesId?: string | null): void {
  revalidatePath("/app");
  revalidatePath("/app/services");
  revalidatePath("/app/planning");
  revalidatePath("/app/map");
  revalidatePath("/app/notifications");
  if (clientId) revalidatePath(`/app/clients/${clientId}`);
  if (serviceId) revalidatePath(`/app/services/${serviceId}`);
  if (seriesId) revalidatePath(`/app/services/contracts/${seriesId}`);
}

export async function createMaintenanceContract(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!can(ctx, "services.create")) return fail("Vous n'avez pas le droit de créer un contrat.");

  const clientId = str(formData.get("client_id"));
  const type = serviceType(formData.get("service_type"));
  const assignedId = str(formData.get("assigned_membership_id"));
  const contractDocumentId = str(formData.get("contract_document_id"));
  const invoiceDocumentId = str(formData.get("invoice_document_id"));
  const startsOn = str(formData.get("starts_on"));
  const endsOn = str(formData.get("ends_on"));
  const weekday = Number(formData.get("recurrence_weekday"));
  const notes = str(formData.get("notes"));
  if (!clientId || !type) return fail("Le client et le type d'entretien sont requis.");
  if (!validDate(startsOn)) return fail("La date de début est requise.");
  if (endsOn && (!validDate(endsOn) || endsOn < startsOn)) return fail("La date de fin doit suivre la date de début.");
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return fail("Choisissez un jour de passage hebdomadaire.");

  const amount = ctx.isAdmin ? readFinancialAmount(formData) : { cents: null };
  if (amount.message) return fail(amount.message);
  if (ctx.isAdmin && amount.cents === null) return fail("Le montant mensuel est requis pour le gérant.");

  const supabase = await createClient();
  if (!(await validateServiceReferences(supabase, ctx.workspace.id, {
    clientId,
    assignedId,
    contractDocumentId,
    invoiceDocumentId,
  }))) return fail("Un élément lié est introuvable dans cet espace ou ne correspond pas au client.");

  const { data: series, error } = await supabase
    .from("service_series")
    .insert({
      workspace_id: ctx.workspace.id,
      client_id: clientId,
      pool_id: null,
      service_type: type,
      mode: "frequency",
      frequency: "weekly",
      default_time: null,
      default_duration_min: null,
      assigned_membership_id: assignedId,
      contract_document_id: contractDocumentId,
      invoice_document_id: invoiceDocumentId,
      notes,
      recurrence_kind: "weekly_contract",
      recurrence_weekday: weekday,
      starts_on: startsOn,
      ends_on: endsOn,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !series) return fail("Création du contrat impossible.");

  if (ctx.isAdmin && amount.cents !== null) {
    const financialError = await saveFinancialAmount(supabase, {
      workspaceId: ctx.workspace.id,
      clientId,
      serviceId: null,
      serviceSeriesId: series.id,
      amountCents: amount.cents,
    });
    if (financialError) {
      await supabase.from("service_series").delete().eq("id", series.id).eq("workspace_id", ctx.workspace.id);
      return fail(financialError);
    }
  }

  await logActivity(ctx, {
    action: "create",
    entity_type: "service_series",
    entity_id: series.id,
    summary: "Contrat d'entretien hebdomadaire créé",
    metadata: { recurrence_weekday: weekday, starts_on: startsOn },
  });
  await notify(ctx.workspace.id, {
    type: "maintenance_contract_created",
    title: "Nouveau contrat d'entretien",
    body: "Un passage hebdomadaire a été planifié.",
    entity_type: "service_series",
    entity_id: series.id,
    link: `/app/services/contracts/${series.id}`,
  });
  if (assignedId) {
    await notify(ctx.workspace.id, {
      type: "service_assigned",
      title: "Contrat d'entretien attribué",
      body: "Un passage hebdomadaire vous a été attribué.",
      recipient_membership_id: assignedId,
      entity_type: "service_series",
      entity_id: series.id,
      link: "/app/services",
    });
  }
  revalidateMaintenance(clientId, null, series.id);
  redirect(`/app/services/contracts/${series.id}`);
}

export async function createOneOffService(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!can(ctx, "services.create")) return fail("Vous n'avez pas le droit de créer un entretien.");

  const clientId = str(formData.get("client_id"));
  const type = serviceType(formData.get("service_type"));
  const scheduledDate = str(formData.get("scheduled_date"));
  const scheduledTime = str(formData.get("scheduled_time"));
  const durationText = str(formData.get("duration_min"));
  const durationMin = durationText ? Number(durationText) : null;
  const assignedId = str(formData.get("assigned_membership_id"));
  const contractDocumentId = str(formData.get("contract_document_id"));
  const invoiceDocumentId = str(formData.get("invoice_document_id"));
  const notes = str(formData.get("notes"));
  if (!clientId || !type) return fail("Le client et le type d'entretien sont requis.");
  if (!validDate(scheduledDate)) return fail("La date de l'entretien est requise.");
  if (durationMin !== null && (!Number.isInteger(durationMin) || durationMin <= 0 || durationMin > 1440)) return fail("La durée doit être comprise entre 1 et 1 440 minutes.");

  const amount = ctx.isAdmin ? readFinancialAmount(formData) : { cents: null };
  if (amount.message) return fail(amount.message);
  if (ctx.isAdmin && amount.cents === null) return fail("Le montant facturé est requis pour le gérant.");

  const supabase = await createClient();
  if (!(await validateServiceReferences(supabase, ctx.workspace.id, {
    clientId,
    assignedId,
    contractDocumentId,
    invoiceDocumentId,
  }))) return fail("Un élément lié est introuvable dans cet espace ou ne correspond pas au client.");

  const { data: service, error } = await supabase
    .from("services")
    .insert({
      workspace_id: ctx.workspace.id,
      client_id: clientId,
      pool_id: null,
      series_id: null,
      service_type: type,
      kind: "unique",
      occurrence_date: null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      duration_min: durationMin,
      assigned_membership_id: assignedId,
      contract_document_id: contractDocumentId,
      invoice_document_id: invoiceDocumentId,
      notes,
    })
    .select("id")
    .single();
  if (error || !service) return fail("Création de l'entretien ponctuel impossible.");

  if (ctx.isAdmin && amount.cents !== null) {
    const financialError = await saveFinancialAmount(supabase, {
      workspaceId: ctx.workspace.id,
      clientId,
      serviceId: service.id,
      serviceSeriesId: null,
      amountCents: amount.cents,
    });
    if (financialError) {
      await supabase.from("services").delete().eq("id", service.id).eq("workspace_id", ctx.workspace.id);
      return fail(financialError);
    }
  }

  await logActivity(ctx, { action: "create", entity_type: "service", entity_id: service.id, summary: "Entretien ponctuel créé" });
  await notify(ctx.workspace.id, {
    type: "service_created",
    title: "Nouvel entretien ponctuel",
    body: `Entretien planifié le ${scheduledDate}.`,
    entity_type: "service",
    entity_id: service.id,
    link: `/app/services/${service.id}`,
  });
  if (assignedId) {
    await notify(ctx.workspace.id, {
      type: "service_assigned",
      title: "Entretien attribué",
      body: `Un entretien ponctuel vous est attribué le ${scheduledDate}.`,
      recipient_membership_id: assignedId,
      entity_type: "service",
      entity_id: service.id,
      link: `/app/services/${service.id}`,
    });
  }
  revalidateMaintenance(clientId, service.id);
  redirect(`/app/services/${service.id}`);
}

interface MaterializedOccurrence {
  id: string;
  client_id: string;
  assigned_membership_id: string | null;
  series_id: string | null;
  occurrence_date: string | null;
  status: ServiceStatus;
}

function canWorkOnOccurrence(ctx: SessionContext, assignedMembershipId: string | null): boolean {
  return can(ctx, "services.edit") || (can(ctx, "services.complete") && assignedMembershipId === ctx.membership.id);
}

async function ensureOccurrence(
  ctx: SessionContext,
  seriesId: string,
  occurrenceDate: string,
): Promise<{ occurrence?: MaterializedOccurrence; message?: string }> {
  if (!uuidSchema.safeParse(seriesId).success || !validDate(occurrenceDate)) return { message: "Occurrence introuvable." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("services")
    .select("id,client_id,assigned_membership_id,series_id,occurrence_date,status")
    .eq("workspace_id", ctx.workspace.id)
    .eq("series_id", seriesId)
    .eq("occurrence_date", occurrenceDate)
    .maybeSingle();
  if (existing) {
    if (!canWorkOnOccurrence(ctx, existing.assigned_membership_id)) return { message: "Cette occurrence ne vous est pas attribuée." };
    return { occurrence: existing as MaterializedOccurrence };
  }

  const { data: series } = await supabase
    .from("service_series")
    .select("id,client_id,service_type,assigned_membership_id,contract_document_id,invoice_document_id,recurrence_kind,recurrence_weekday,starts_on,ends_on,status")
    .eq("id", seriesId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!series || series.recurrence_kind !== "weekly_contract" || series.status === "paused") return { message: "Contrat hebdomadaire introuvable ou suspendu." };
  if (!canWorkOnOccurrence(ctx, series.assigned_membership_id)) return { message: "Cette occurrence ne vous est pas attribuée." };
  if (weeklyDatesInRange({
    starts_on: series.starts_on,
    ends_on: series.ends_on,
    recurrence_weekday: series.recurrence_weekday,
  }, occurrenceDate, occurrenceDate).length !== 1) return { message: "Cette date ne correspond pas au contrat." };

  // La service_role n'est utilisée qu'après validation stricte du tenant, de la
  // règle et de l'autorisation. Elle permet à un technicien assigné de créer la
  // trace de son passage sans lui accorder services.create globalement.
  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("services")
    .insert({
      workspace_id: ctx.workspace.id,
      client_id: series.client_id,
      pool_id: null,
      series_id: series.id,
      service_type: series.service_type,
      kind: "recurring",
      occurrence_date: occurrenceDate,
      scheduled_date: occurrenceDate,
      scheduled_time: null,
      duration_min: null,
      assigned_membership_id: series.assigned_membership_id,
      contract_document_id: series.contract_document_id,
      invoice_document_id: series.invoice_document_id,
      notes: null,
      status: "planned",
    })
    .select("id,client_id,assigned_membership_id,series_id,occurrence_date,status")
    .single();
  if (!error && inserted) return { occurrence: inserted as MaterializedOccurrence };
  if (error?.code === "23505") {
    const { data: concurrent } = await admin
      .from("services")
      .select("id,client_id,assigned_membership_id,series_id,occurrence_date,status")
      .eq("workspace_id", ctx.workspace.id)
      .eq("series_id", seriesId)
      .eq("occurrence_date", occurrenceDate)
      .single();
    if (concurrent) return { occurrence: concurrent as MaterializedOccurrence };
  }
  return { message: "Création de la trace de passage impossible." };
}

async function resolveEditableOccurrence(
  ctx: SessionContext,
  input: { serviceId?: string; seriesId?: string; occurrenceDate?: string },
): Promise<{ occurrence?: MaterializedOccurrence; message?: string }> {
  if (input.serviceId) {
    if (!uuidSchema.safeParse(input.serviceId).success) return { message: "Entretien introuvable." };
    const supabase = await createClient();
    const { data: service } = await supabase
      .from("services")
      .select("id,client_id,assigned_membership_id,series_id,occurrence_date,status")
      .eq("id", input.serviceId)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    if (!service || !canWorkOnOccurrence(ctx, service.assigned_membership_id)) return { message: "Entretien introuvable ou non attribué." };
    return { occurrence: service as MaterializedOccurrence };
  }
  if (!input.seriesId || !input.occurrenceDate) return { message: "Occurrence introuvable." };
  return ensureOccurrence(ctx, input.seriesId, input.occurrenceDate);
}

async function updateOccurrenceStatus(
  input: { serviceId?: string; seriesId?: string; occurrenceDate?: string },
  status: ServiceStatus,
): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!["planned", "in_progress", "completed", "postponed", "cancelled"].includes(status)) return fail("Statut invalide.");
  if (status === "postponed") return fail("Utilisez l'exception de date pour reporter un passage.");
  if (!can(ctx, "services.edit") && !["planned", "in_progress", "completed"].includes(status)) return fail("Seul un responsable peut reporter ou annuler un entretien.");

  const resolved = await resolveEditableOccurrence(ctx, input);
  if (!resolved.occurrence) return fail(resolved.message ?? "Occurrence introuvable.");
  const occurrence = resolved.occurrence;
  if (!can(ctx, "services.edit") && occurrence.status === "cancelled") return fail("Un passage annulé doit être rétabli par un responsable.");
  const patch: Record<string, unknown> = { status };
  if (status === "planned") Object.assign(patch, { started_at: null, completed_at: null, completed_by: null });
  if (status === "in_progress") Object.assign(patch, { started_at: new Date().toISOString(), completed_at: null, completed_by: null });
  if (status === "completed") Object.assign(patch, { completed_at: new Date().toISOString(), completed_by: ctx.membership.id });
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(patch).eq("id", occurrence.id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Mise à jour impossible.");

  await logActivity(ctx, { action: "update", entity_type: "service", entity_id: occurrence.id, summary: `Entretien ${status}` });
  if (status === "completed") {
    await notify(ctx.workspace.id, {
      type: "service_completed",
      title: "Entretien terminé",
      body: `Un entretien a été terminé par ${ctx.membership.first_name ?? "un membre"}.`,
      entity_type: "service",
      entity_id: occurrence.id,
      link: `/app/services/${occurrence.id}`,
    });
  }
  revalidateMaintenance(occurrence.client_id, occurrence.id, occurrence.series_id);
  return ok("Statut mis à jour.", { serviceId: occurrence.id });
}

export async function setServiceStatus(serviceId: string, status: ServiceStatus): Promise<ActionResult> {
  return updateOccurrenceStatus({ serviceId }, status);
}

export async function setWeeklyOccurrenceStatus(seriesId: string, occurrenceDate: string, status: ServiceStatus): Promise<ActionResult> {
  return updateOccurrenceStatus({ seriesId, occurrenceDate }, status);
}

export async function saveServiceReport(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  const serviceId = str(formData.get("id"));
  const seriesId = str(formData.get("series_id"));
  const occurrenceDate = str(formData.get("occurrence_date"));
  const resolved = await resolveEditableOccurrence(ctx, {
    serviceId: serviceId ?? undefined,
    seriesId: seriesId ?? undefined,
    occurrenceDate: occurrenceDate ?? undefined,
  });
  if (!resolved.occurrence) return fail(resolved.message ?? "Occurrence introuvable.");
  if (!can(ctx, "services.edit") && resolved.occurrence.status === "cancelled") return fail("Un passage annulé ne peut pas recevoir de compte-rendu.");
  const report = str(formData.get("report"));
  const notes = formData.has("notes") ? str(formData.get("notes")) : undefined;
  const patch: { report: string | null; notes?: string | null } = { report };
  if (notes !== undefined) patch.notes = notes;
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(patch).eq("id", resolved.occurrence.id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");
  revalidateMaintenance(resolved.occurrence.client_id, resolved.occurrence.id, resolved.occurrence.series_id);
  return ok("Compte-rendu enregistré.", { serviceId: resolved.occurrence.id });
}

export async function updateOccurrenceException(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!can(ctx, "services.edit")) return fail("Vous n'avez pas le droit de modifier une exception.");
  const serviceId = str(formData.get("id"));
  const seriesId = str(formData.get("series_id"));
  const occurrenceDate = str(formData.get("occurrence_date"));
  const scheduledDate = str(formData.get("scheduled_date"));
  if (!validDate(scheduledDate)) return fail("Choisissez la nouvelle date du passage.");
  const resolved = await resolveEditableOccurrence(ctx, {
    serviceId: serviceId ?? undefined,
    seriesId: seriesId ?? undefined,
    occurrenceDate: occurrenceDate ?? undefined,
  });
  if (!resolved.occurrence) return fail(resolved.message ?? "Occurrence introuvable.");

  const supabase = await createClient();
  const { data: current } = await supabase.from("services").select("status").eq("id", resolved.occurrence.id).single();
  if (current?.status === "completed" || current?.status === "in_progress") return fail("Un passage en cours ou terminé ne peut pas être déplacé.");
  const nominalDate = resolved.occurrence.occurrence_date;
  if (!nominalDate || !resolved.occurrence.series_id) return fail("Seul un passage récurrent peut recevoir cette exception.");
  const { error } = await supabase
    .from("services")
    .update({ scheduled_date: scheduledDate, status: scheduledDate === nominalDate ? "planned" : "postponed" })
    .eq("id", resolved.occurrence.id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Déplacement impossible.");
  await logActivity(ctx, {
    action: "update",
    entity_type: "service",
    entity_id: resolved.occurrence.id,
    summary: scheduledDate === nominalDate ? "Exception retirée" : "Occurrence reportée",
    metadata: { occurrence_date: nominalDate, scheduled_date: scheduledDate },
  });
  revalidateMaintenance(resolved.occurrence.client_id, resolved.occurrence.id, resolved.occurrence.series_id);
  return ok(scheduledDate === nominalDate ? "Le passage suit de nouveau le contrat." : "Passage reporté.", { serviceId: resolved.occurrence.id });
}

export async function updateMaintenanceContract(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!can(ctx, "services.edit")) return fail("Vous n'avez pas le droit de modifier ce contrat.");
  const id = str(formData.get("id"));
  const type = serviceType(formData.get("service_type"));
  const assignedId = str(formData.get("assigned_membership_id"));
  const contractDocumentId = str(formData.get("contract_document_id"));
  const invoiceDocumentId = str(formData.get("invoice_document_id"));
  const startsOn = str(formData.get("starts_on"));
  let endsOn = str(formData.get("ends_on"));
  const weekday = Number(formData.get("recurrence_weekday"));
  const status = str(formData.get("status"));
  if (!id || !type || !validDate(startsOn)) return fail("Contrat invalide.");
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return fail("Choisissez un jour de passage.");
  if (!status || !["active", "paused", "ended"].includes(status)) return fail("Statut du contrat invalide.");
  if (status === "ended" && !endsOn) endsOn = todayInReunion();
  if (endsOn && (!validDate(endsOn) || endsOn < startsOn)) return fail("La date de fin doit suivre la date de début.");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("service_series")
    .select("client_id,recurrence_kind")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!existing || existing.recurrence_kind !== "weekly_contract") return fail("Contrat introuvable.");
  if (!(await validateServiceReferences(supabase, ctx.workspace.id, {
    clientId: existing.client_id,
    assignedId,
    contractDocumentId,
    invoiceDocumentId,
  }))) return fail("Un élément lié est introuvable dans cet espace ou ne correspond pas au client.");

  const amount = ctx.isAdmin ? readFinancialAmount(formData) : { cents: null };
  if (amount.message) return fail(amount.message);
  if (ctx.isAdmin && amount.cents === null) return fail("Le montant mensuel est requis pour le gérant.");
  const { error } = await supabase
    .from("service_series")
    .update({
      service_type: type,
      assigned_membership_id: assignedId,
      contract_document_id: contractDocumentId,
      invoice_document_id: invoiceDocumentId,
      notes: str(formData.get("notes")),
      recurrence_weekday: weekday,
      starts_on: startsOn,
      ends_on: endsOn,
      status,
    })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement du contrat impossible.");
  if (ctx.isAdmin && amount.cents !== null) {
    const financialError = await saveFinancialAmount(supabase, {
      workspaceId: ctx.workspace.id,
      clientId: existing.client_id,
      serviceId: null,
      serviceSeriesId: id,
      amountCents: amount.cents,
    });
    if (financialError) return fail(financialError);
  }
  await logActivity(ctx, { action: "update", entity_type: "service_series", entity_id: id, summary: "Contrat d'entretien modifié" });
  revalidateMaintenance(existing.client_id, null, id);
  return ok("Contrat enregistré.");
}

export async function updateService(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!can(ctx, "services.edit")) return fail("Vous n'avez pas le droit de modifier cet entretien.");
  const id = str(formData.get("id"));
  if (!id) return fail("Entretien introuvable.");
  const scheduledDate = str(formData.get("scheduled_date"));
  const submittedType = str(formData.get("service_type"));
  const assignedId = str(formData.get("assigned_membership_id"));
  const contractDocumentId = str(formData.get("contract_document_id"));
  const invoiceDocumentId = str(formData.get("invoice_document_id"));
  const durationText = str(formData.get("duration_min"));
  const durationMin = durationText ? Number(durationText) : null;
  if (!validDate(scheduledDate) || !submittedType) return fail("La date et le type sont requis.");
  if (durationMin !== null && (!Number.isInteger(durationMin) || durationMin <= 0 || durationMin > 1440)) return fail("Durée invalide.");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("services")
    .select("client_id,kind,series_id,service_type")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!existing) return fail("Entretien introuvable.");
  const type = allowedServiceTypes.has(submittedType) || submittedType === existing.service_type ? submittedType : null;
  if (!type) return fail("Le type d'entretien est invalide.");
  if (!(await validateServiceReferences(supabase, ctx.workspace.id, {
    clientId: existing.client_id,
    assignedId,
    contractDocumentId,
    invoiceDocumentId,
  }))) return fail("Un élément lié est introuvable dans cet espace ou ne correspond pas au client.");

  const { error } = await supabase
    .from("services")
    .update({
      service_type: type,
      scheduled_date: scheduledDate,
      scheduled_time: str(formData.get("scheduled_time")),
      duration_min: durationMin,
      assigned_membership_id: assignedId,
      contract_document_id: contractDocumentId,
      invoice_document_id: invoiceDocumentId,
      notes: str(formData.get("notes")),
    })
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");

  if (ctx.isAdmin) {
    const amount = readFinancialAmount(formData);
    if (amount.message) return fail(amount.message);
    if (amount.cents !== null) {
      const financialError = await saveFinancialAmount(supabase, {
        workspaceId: ctx.workspace.id,
        clientId: existing.client_id,
        serviceId: existing.kind === "unique" ? id : null,
        serviceSeriesId: existing.kind === "recurring" ? existing.series_id : null,
        amountCents: amount.cents,
      });
      if (financialError) return fail(financialError);
    }
  }
  await logActivity(ctx, { action: "update", entity_type: "service", entity_id: id, summary: "Entretien modifié" });
  revalidateMaintenance(existing.client_id, id, existing.series_id);
  return ok("Entretien enregistré.");
}

export async function toggleServiceTask(taskId: string, serviceId: string, done: boolean): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("assigned_membership_id")
    .eq("id", serviceId)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!service || !canWorkOnOccurrence(ctx, service.assigned_membership_id)) return fail("Action non autorisée.");
  const { error } = await supabase
    .from("service_tasks")
    .update({ done })
    .eq("id", taskId)
    .eq("service_id", serviceId)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  revalidatePath(`/app/services/${serviceId}`);
  return ok();
}

export async function deleteService(id: string): Promise<ActionResult> {
  const result = await actionContext();
  if ("error" in result) return result.error;
  const { ctx } = result;
  if (!can(ctx, "services.edit")) return fail("Vous n'avez pas le droit de supprimer cet entretien.");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("client_id,kind,series_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!service) return fail("Entretien introuvable.");
  if (service.kind !== "unique") return fail("Une occurrence récurrente doit être annulée afin de conserver l'historique.");
  const { error } = await supabase.from("services").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "service", entity_id: id, summary: "Entretien ponctuel supprimé" });
  revalidateMaintenance(service.client_id, id, service.series_id);
  redirect("/app/services");
}
