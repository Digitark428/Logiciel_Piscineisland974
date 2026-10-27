import type { Metadata } from "next";
import { can, requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getMaintenanceOccurrences, occurrenceHref } from "@/lib/services/queries";
import { operationalClientName, memberName } from "@/lib/utils/format";
import { todayInReunion } from "@/lib/utils/date";
import { INTELLIGENCE_TOOLS, type IntelligenceItem, type IntelligenceSnapshot } from "@/lib/leti-intelligence/types";
import { IntelligenceWorkspace } from "./IntelligenceWorkspace";

export const metadata: Metadata = { title: "LETI Intelligence Bêta" };
export const dynamic = "force-dynamic";

export default async function LetiIntelligenceBetaPage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  const date = todayInReunion();
  const canServices = can(ctx, "services.view");
  const canTasks = can(ctx, "tasks.view");
  const canPlanning = can(ctx, "planning.view");
  const serviceScope = ctx.isAdmin || can(ctx, "services.edit") ? undefined : ctx.membership.id;

  const [services, tasksResult, eventsResult, clientsResult] = await Promise.all([
    canServices
      ? getMaintenanceOccurrences(supabase, { workspaceId: ctx.workspace.id, start: date, end: date, assignedMembershipId: serviceScope })
      : Promise.resolve([]),
    canTasks
      ? supabase.from("tasks")
          .select("id,title,status,due_date,due_time,category,created_by,assigned_membership_id")
          .eq("workspace_id", ctx.workspace.id)
          .or(`due_date.lte.${date},due_date.is.null`)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
    canPlanning
      ? supabase.from("planning_events")
          .select("id,title,start_time,all_day,event_date")
          .eq("workspace_id", ctx.workspace.id)
          .eq("event_date", date)
          .or(`owner_membership_id.eq.${ctx.membership.id},assigned_membership_id.eq.${ctx.membership.id}`)
          .order("start_time")
          .limit(30)
      : Promise.resolve({ data: [] }),
    can(ctx, "clients.view")
      ? supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspace.id).eq("status", "active")
      : Promise.resolve({ count: null }),
  ]);

  const visibleTasks = (tasksResult.data ?? []).filter((task) => task.category !== "personal" || task.created_by === ctx.membership.id);
  const mapTask = (task: typeof visibleTasks[number]): IntelligenceItem => ({
    id: task.id,
    title: task.title,
    detail: task.due_date === date ? `Aujourd’hui${task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ""}` : task.due_date ? "En retard" : "Sans échéance",
    href: task.category === "personal" ? "/app/tasks/personal" : "/app/tasks/assign",
    status: task.status,
  });
  const snapshot: IntelligenceSnapshot = {
    date,
    user: memberName(ctx.membership),
    workspace: ctx.workspace.name,
    services: services.map((service) => ({
      id: service.key,
      title: operationalClientName(service.client),
      detail: `${service.scheduledTime?.slice(0, 5) ?? "Horaire libre"} · ${service.serviceType || "Entretien"}`,
      href: occurrenceHref(service),
      status: service.status,
    })),
    events: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      detail: event.all_day ? "Toute la journée" : event.start_time?.slice(0, 5) ?? "Horaire libre",
      href: `/app/planning?view=day&date=${date}`,
    })),
    tasks: visibleTasks.filter((task) => task.status !== "done" && (!task.due_date || task.due_date === date)).map(mapTask),
    overdueTasks: visibleTasks.filter((task) => task.status !== "done" && Boolean(task.due_date && task.due_date < date)).map(mapTask),
    completedServices: services.filter((service) => service.status === "completed").length,
    remainingServices: services.filter((service) => service.status !== "completed" && service.status !== "cancelled").length,
    completedTasks: visibleTasks.filter((task) => task.status === "done" && task.due_date === date).length,
    activeClients: clientsResult.count ?? null,
    permissions: INTELLIGENCE_TOOLS.filter((tool) => can(ctx, tool.readPermission as Parameters<typeof can>[1])).map((tool) => tool.module),
    source: "live",
    unavailable: [("error" in tasksResult && tasksResult.error) ? "tâches" : null, ("error" in eventsResult && eventsResult.error) ? "événements" : null, ("error" in clientsResult && clientsResult.error) ? "clients" : null].filter((value): value is string => Boolean(value)),
  };

  return <IntelligenceWorkspace snapshot={snapshot} storageKey={`leti-intelligence-v1:${ctx.workspace.id}:${ctx.membership.id}`} />;
}
