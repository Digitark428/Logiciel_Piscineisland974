"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity, notify } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

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
    if (iso && !Number.isNaN(new Date(iso).getTime())) out.push(iso);
  }
  return out;
}

/** Génère des dates à partir d'une fréquence régulière. */
function generateFrequencyDates(start: string, frequency: string, count: number): string[] {
  const dates: string[] = [];
  const base = new Date(start + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    if (frequency === "weekly") d.setDate(base.getDate() + i * 7);
    else if (frequency === "biweekly") d.setDate(base.getDate() + i * 14);
    else if (frequency === "monthly") d.setMonth(base.getMonth() + i);
    else d.setDate(base.getDate() + i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const baseSchema = z.object({
  client_id: z.string().uuid("Client requis."),
  service_type: z.string().optional(),
});

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
  const notes = str(formData.get("notes"));
  const taskLines = String(formData.get("tasks") ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

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
      const { data: series } = await supabase
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
          notes,
        })
        .select("id")
        .single();
      series_id = series?.id ?? null;
    } else {
      const raw = String(formData.get("manual_dates") ?? "");
      dates = parseDates(raw);
      if (dates.length === 0) return fail("Saisissez au moins une date valide (JJ/MM/AAAA ou AAAA-MM-JJ).");
      const { data: series } = await supabase
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
          notes,
        })
        .select("id")
        .single();
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
    notes,
  }));

  const { data: created, error } = await supabase.from("services").insert(rows).select("id");
  if (error || !created) return fail("Création impossible (droits insuffisants ?).");

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
    notes: str(formData.get("notes")),
  };
  if (!payload.scheduled_date) return fail("La date est requise.");

  const supabase = createClient();
  const { error } = await supabase.from("services").update(payload).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "update", entity_type: "service", entity_id: id, summary: "Prestation modifiée" });
  revalidatePath(`/app/services/${id}`);
  revalidatePath("/app/planning");
  return ok("Prestation enregistrée.");
}

export async function setServiceStatus(id: string, status: "planned" | "in_progress" | "completed" | "cancelled"): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();

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
  const { error } = await supabase.from("service_tasks").update({ done }).eq("id", taskId).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  revalidatePath(`/app/services/${serviceId}`);
  return ok();
}

export async function deleteService(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { error } = await supabase.from("services").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "service", entity_id: id, summary: "Prestation supprimée" });
  revalidatePath("/app/services");
  revalidatePath("/app/planning");
  redirect("/app/services");
}
