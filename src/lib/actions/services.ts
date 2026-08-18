"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity, notify } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { dateOnlyToUtcDate, utcDateToDateOnly } from "@/lib/utils/date";
import { parseMoneyToCents } from "@/lib/utils/money";

const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

/** Analyse une liste de dates saisies (une par ligne ou séparées par des virgules). */
function parseDates(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    let iso: string | null = null;
    const isoMatch = p.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const frMatch = p.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (isoMatch) iso = p;
    else if (frMatch) {
      const [, d, m, y] = frMatch;
      iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (iso && dateOnlyToUtcDate(iso)) out.push(iso);
  }
  return out;
}

/** Génère des dates à partir d'une fréquence régulière. */
function generateFrequencyDates(start: string, frequency: string, count: number): string[] {
  const dates: string[] = [];
  const base = dateOnlyToUtcDate(start);
  if (!base) return dates;
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    if (frequency === "weekly") d.setUTCDate(base.getUTCDate() + i * 7);
    else if (frequency === "biweekly") d.setUTCDate(base.getUTCDate() + i * 14);
    else if (frequency === "monthly") d.setUTCMonth(base.getUTCMonth() + i);
    else d.setUTCDate(base.getUTCDate() + i * 7);
    dates.push(utcDateToDateOnly(d));
  }
  return dates;
}

const baseSchema = z.object({
  client_id: z.string().uuid("Client requis."),
  service_type: z.string().optional(),
});

function readFinancialAmount(formData: FormData): { cents: number | null; message?: string } {
  const raw = str(formData.get("amount"));
  if (!raw) return { cents: null };
  const cents = parseMoneyToCents(raw);
  if (cents === null) return { cents: null, message: "Saisissez un montant valide, par exemple 200 ou 200,50." };
  return { cents };
}

async function saveFinancialAmount(
  supabase: ReturnType<typeof createClient>,
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
  if (!targetId) return "La série de prestations est introuvable.";

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

async function validateServiceReferences(
  supabase: ReturnType<typeof createClient>, workspaceId: string,
  refs: { clientId: string; poolId: string | null; assignedId: string | null; contractDocumentId: string | null; invoiceDocumentId: string | null },
): Promise<boolean> {
  const checks = [
    supabase.from("clients").select("id").eq("id", refs.clientId).eq("workspace_id", workspaceId).maybeSingle(),
    refs.poolId ? supabase.from("pools").select("id").eq("id", refs.poolId).eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: { id: "none" } }),
    refs.assignedId ? supabase.from("memberships").select("id").eq("id", refs.assignedId).eq("workspace_id", workspaceId).eq("status", "active").maybeSingle() : Promise.resolve({ data: { id: "none" } }),
    refs.contractDocumentId ? supabase.from("documents").select("id").eq("id", refs.contractDocumentId).eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: { id: "none" } }),
    refs.invoiceDocumentId ? supabase.from("documents").select("id").eq("id", refs.invoiceDocumentId).eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: { id: "none" } }),
  ];
  return (await Promise.all(checks)).every((result) => Boolean(result.data));
}

export async function createService(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  const kind = String(formData.get("kind") ?? "unique"); // 'unique' | 'recurring'
  const parsed = baseSchema.safeParse({
    client_id: formData.get("client_id"),
    service_type: formData.get("service_type"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide.");

  const supabase = createClient();
  const client_id = parsed.data.client_id;
  const pool_id = str(formData.get("pool_id"));
  const service_type = str(formData.get("service_type"));
  const scheduled_time = str(formData.get("scheduled_time"));
  const durationRaw = str(formData.get("duration_min"));
  const duration_min = durationRaw ? Number(durationRaw) : null;
  const assigned = str(formData.get("assigned_membership_id"));
  const contract_document_id = str(formData.get("contract_document_id"));
  const invoice_document_id = str(formData.get("invoice_document_id"));
  const notes = str(formData.get("notes"));
  const taskLines = String(formData.get("tasks") ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const financialAmount = ctx.isAdmin ? readFinancialAmount(formData) : { cents: null };
  if (financialAmount.message) return fail(financialAmount.message);
  if (ctx.isAdmin && financialAmount.cents === null) return fail("Le montant facturé est requis pour le gérant.");

  if (!(await validateServiceReferences(supabase, ctx.workspace.id, { clientId: client_id, poolId: pool_id, assignedId: assigned, contractDocumentId: contract_document_id, invoiceDocumentId: invoice_document_id }))) {
    return fail("Un élément lié est introuvable dans cet espace.");
  }

  // ---- Détermine les dates à créer ----
  let dates: string[] = [];
  let series_id: string | null = null;

  if (kind === "unique") {
    const d = str(formData.get("scheduled_date"));
    if (!d) return fail("La date est requise.");
    dates = [d];
  } else {
    const mode = String(formData.get("mode") ?? "manual"); // 'frequency' | 'manual'
    if (mode === "frequency") {
      const start = str(formData.get("start_date"));
      const frequency = String(formData.get("frequency") ?? "weekly");
      const count = Math.min(Math.max(Number(formData.get("count") ?? 8), 1), 60);
      if (!start) return fail("Date de début requise.");
      dates = generateFrequencyDates(start, frequency, count);
      const { data: series, error: seriesError } = await supabase
        .from("service_series")
        .insert({
          workspace_id: ctx.workspace.id,
          client_id,
          pool_id,
          service_type,
          mode: "frequency",
          frequency,
          default_time: scheduled_time,
          default_duration_min: duration_min,
          assigned_membership_id: assigned,
          contract_document_id,
          invoice_document_id,
          notes,
        })
        .select("id")
        .single();
      if (seriesError || !series) return fail("Création de la série impossible.");
      series_id = series?.id ?? null;
    } else {
      const raw = String(formData.get("manual_dates") ?? "");
      dates = parseDates(raw);
      if (dates.length === 0) return fail("Saisissez au moins une date valide (JJ/MM/AAAA ou AAAA-MM-JJ).");
      const { data: series, error: seriesError } = await supabase
        .from("service_series")
        .insert({
          workspace_id: ctx.workspace.id,
          client_id,
          pool_id,
          service_type,
          mode: "manual",
          default_time: scheduled_time,
          default_duration_min: duration_min,
          assigned_membership_id: assigned,
          contract_document_id,
          invoice_document_id,
          notes,
        })
        .select("id")
        .single();
      if (seriesError || !series) return fail("Création de la série impossible.");
      series_id = series?.id ?? null;
    }
  }

  // ---- Crée les prestations ----
  const rows = dates.map((d) => ({
    workspace_id: ctx.workspace.id,
    client_id,
    pool_id,
    series_id,
    service_type,
    kind: kind === "unique" ? "unique" : "recurring",
    scheduled_date: d,
    scheduled_time,
    duration_min,
    assigned_membership_id: assigned,
    contract_document_id,
    invoice_document_id,
    notes,
  }));

  const { data: created, error } = await supabase.from("services").insert(rows).select("id");
  if (error || !created) return fail("Création impossible (droits insuffisants ?).");

  // Les montants sont écrits dans la table financière RLS admin-only, jamais
  // dans les occurrences. Une récurrence pointe vers sa série unique.
  if (ctx.isAdmin && financialAmount.cents !== null) {
    const financialError = await saveFinancialAmount(supabase, {
      workspaceId: ctx.workspace.id,
      clientId: client_id,
      serviceId: kind === "unique" ? created[0]?.id ?? null : null,
      serviceSeriesId: kind === "recurring" ? series_id : null,
      amountCents: financialAmount.cents,
    });
    if (financialError) {
      await supabase.from("services").delete().in("id", created.map((service) => service.id)).eq("workspace_id", ctx.workspace.id);
      if (series_id) await supabase.from("service_series").delete().eq("id", series_id).eq("workspace_id", ctx.workspace.id);
      return fail(financialError);
    }
  }

  // Tâches d'entretien communes appliquées à chaque prestation
  if (taskLines.length > 0) {
    const taskRows = created.flatMap((sv: any) =>
      taskLines.map((label, i) => ({ workspace_id: ctx.workspace.id, service_id: sv.id, label, position: i })),
    );
    await supabase.from("service_tasks").insert(taskRows);
  }

  await logActivity(ctx, {
    action: "create",
    entity_type: "service",
    entity_id: created[0]?.id,
    summary: `${created.length} prestation(s) créée(s)`,
  });

  // Notifications : admins + membre assigné
  await notify(ctx.workspace.id, {
    type: "service_created",
    title: "Nouvelle prestation",
    body: `${created.length} prestation(s) planifiée(s).`,
    entity_type: "service",
    entity_id: created[0]?.id,
    link: created.length === 1 ? `/app/services/${created[0].id}` : "/app/services",
  });
  if (assigned) {
    await notify(ctx.workspace.id, {
      type: "service_assigned",
      title: "Prestation attribuée",
      body: `${created.length} prestation(s) vous ont été attribuée(s).`,
      recipient_membership_id: assigned,
      entity_type: "service",
      link: "/app/services",
    });
  }

  revalidatePath("/app/services");
  revalidatePath("/app/planning");
  revalidatePath("/app");
  revalidatePath(`/app/clients/${client_id}`);
  if (created.length === 1) redirect(`/app/services/${created[0].id}`);
  redirect(`/app/clients/${client_id}`);
}

export async function updateService(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Prestation introuvable.");

  const durationRaw = str(formData.get("duration_min"));
  const payload = {
    service_type: str(formData.get("service_type")),
    scheduled_date: str(formData.get("scheduled_date")),
    scheduled_time: str(formData.get("scheduled_time")),
    duration_min: durationRaw ? Number(durationRaw) : null,
    assigned_membership_id: str(formData.get("assigned_membership_id")),
    pool_id: str(formData.get("pool_id")),
    contract_document_id: str(formData.get("contract_document_id")),
    invoice_document_id: str(formData.get("invoice_document_id")),
    notes: str(formData.get("notes")),
  };
  if (!payload.scheduled_date) return fail("La date est requise.");

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("services")
    .select("client_id, kind, series_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!existing || !(await validateServiceReferences(supabase, ctx.workspace.id, { clientId: existing.client_id, poolId: payload.pool_id, assignedId: payload.assigned_membership_id, contractDocumentId: payload.contract_document_id, invoiceDocumentId: payload.invoice_document_id }))) {
    return fail("Un élément lié est introuvable dans cet espace.");
  }
  if (ctx.isAdmin) {
    const financialAmount = readFinancialAmount(formData);
    if (financialAmount.message) return fail(financialAmount.message);
    if (financialAmount.cents !== null) {
      const financialError = await saveFinancialAmount(supabase, {
        workspaceId: ctx.workspace.id,
        clientId: existing.client_id,
        serviceId: existing.kind === "unique" ? id : null,
        serviceSeriesId: existing.kind === "recurring" ? existing.series_id : null,
        amountCents: financialAmount.cents,
      });
      if (financialError) return fail(financialError);
    }
  }
  const { error } = await supabase.from("services").update(payload).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "update", entity_type: "service", entity_id: id, summary: "Prestation modifiée" });
  revalidatePath(`/app/services/${id}`);
  revalidatePath("/app/planning");
  revalidatePath("/app");
  revalidatePath(`/app/clients/${existing.client_id}`);
  return ok("Prestation enregistrée.");
}

export async function setServiceStatus(id: string, status: "planned" | "in_progress" | "completed" | "cancelled"): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { data: service } = await supabase
    .from("services")
    .select("client_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  const patch: Record<string, unknown> = { status };
  if (status === "in_progress") patch.started_at = new Date().toISOString();
  if (status === "completed") {
    patch.completed_at = new Date().toISOString();
    patch.completed_by = ctx.membership.id;
  }

  const { error } = await supabase.from("services").update(patch).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible (droits insuffisants ?).");

  await logActivity(ctx, { action: "update", entity_type: "service", entity_id: id, summary: `Prestation ${status}` });
  if (status === "completed") {
    await notify(ctx.workspace.id, {
      type: "service_completed",
      title: "Prestation terminée",
      body: `Une prestation a été terminée par ${ctx.membership.first_name ?? "un membre"}.`,
      entity_type: "service",
      entity_id: id,
      link: `/app/services/${id}`,
    });
  }
  revalidatePath(`/app/services/${id}`);
  revalidatePath("/app/planning");
  revalidatePath("/app");
  if (service?.client_id) revalidatePath(`/app/clients/${service.client_id}`);
  return ok("Statut mis à jour.");
}

export async function saveServiceReport(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const id = String(formData.get("id") ?? "");
  const report = str(formData.get("report"));
  const supabase = createClient();
  const { error } = await supabase.from("services").update({ report }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");
  revalidatePath(`/app/services/${id}`);
  return ok("Compte-rendu enregistré.");
}

export async function toggleServiceTask(taskId: string, serviceId: string, done: boolean): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("service_tasks").update({ done }).eq("id", taskId).eq("service_id", serviceId).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  revalidatePath(`/app/services/${serviceId}`);
  return ok();
}

export async function deleteService(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { data: service } = await supabase
    .from("services")
    .select("client_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  const { error } = await supabase.from("services").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "service", entity_id: id, summary: "Prestation supprimée" });
  revalidatePath("/app/services");
  revalidatePath("/app/planning");
  revalidatePath("/app");
  if (service?.client_id) revalidatePath(`/app/clients/${service.client_id}`);
  redirect("/app/services");
}
