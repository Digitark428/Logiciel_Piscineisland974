import Link from "next/link";
import { can, requirePermission } from "@/lib/auth/context";
import { getMaintenanceOccurrences, occurrenceHref } from "@/lib/services/queries";
import { createClient } from "@/lib/supabase/server";
import { clientName, formatDate, formatTime, memberJobTitle, memberName } from "@/lib/utils/format";
import { addCalendarDays } from "@/lib/services/recurrence";
import { todayInReunion } from "@/lib/utils/date";
import { PageHeader } from "@/components/ui";
import { ServiceMap, type MapPoint, type MapService } from "./ServiceMap";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: { date?: string } }) {
  const ctx = await requirePermission("map.view");
  const supabase = createClient();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : todayInReunion();
  const seesAll = ctx.isAdmin || can(ctx, "services.edit");
  const occurrences = await getMaintenanceOccurrences(supabase, {
    workspaceId: ctx.workspace.id,
    start: date,
    end: date,
    assignedMembershipId: seesAll ? undefined : ctx.membership.id,
  });
  const avatarByPath = await signedUrls("avatars", occurrences.map((occurrence) => occurrence.assignee?.photo_path));

  const pointByAddress = new Map<string, MapPoint>();
  const assigneeMap = new Map<string, string>();
  for (const occurrence of occurrences) {
    const location = occurrence.pool ?? occurrence.client;
    const lat = location.latitude;
    const lng = location.longitude;
    if (lat === null || lng === null) continue;
    const address = [location.address_line1, location.postal_code, location.city].filter(Boolean).join(", ");
    const assignee = occurrence.assignee ? memberName(occurrence.assignee) : "";
    if (occurrence.assignedMembershipId && assignee) assigneeMap.set(occurrence.assignedMembershipId, assignee);
    const service: MapService = {
      id: occurrence.key,
      href: occurrenceHref(occurrence),
      code: occurrence.code ?? "",
      client: clientName(occurrence.client),
      serviceType: occurrence.serviceType,
      date: formatDate(occurrence.scheduledDate),
      time: occurrence.scheduledTime ? formatTime(occurrence.scheduledTime) : "",
      sortKey: `${occurrence.scheduledDate} ${occurrence.scheduledTime ?? ""}`,
      status: occurrence.status,
      assigneeId: occurrence.assignedMembershipId,
      assignee,
      assigneeShortName: occurrence.assignee?.first_name ?? assignee,
      assigneeJobTitle: occurrence.assignee ? memberJobTitle({
        job_title: occurrence.assignee.job_title,
        role: occurrence.assignee.role === "admin" ? "admin" : "member",
      }) ?? "" : "",
      assigneeAvatarUrl: occurrence.assignee?.photo_path ? avatarByPath.get(occurrence.assignee.photo_path) ?? null : null,
    };
    const pointKey = [Number(lat).toFixed(6), Number(lng).toFixed(6), address.toLocaleLowerCase("fr")].join(":");
    const existing = pointByAddress.get(pointKey);
    if (existing) existing.services.push(service);
    else pointByAddress.set(pointKey, {
      id: pointKey,
      lat: Number(lat),
      lng: Number(lng),
      client: clientName(occurrence.client),
      address,
      services: [service],
    });
  }

  const points = Array.from(pointByAddress.values()).map((point) => {
    const clientNames = new Set(point.services.map((service) => service.client));
    return {
      ...point,
      client: clientNames.size === 1 ? point.services[0].client : `${clientNames.size} clients`,
      services: [...point.services].sort((left, right) => left.sortKey.localeCompare(right.sortKey)),
    };
  });
  const assignees = Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }));
  const geocodedCount = points.reduce((count, point) => count + point.services.length, 0);
  const previous = addCalendarDays(date, -1) ?? date;
  const next = addCalendarDays(date, 1) ?? date;

  return (
    <div>
      <PageHeader
        title="Carte des entretiens"
        description="Visualisez les passages du jour et lancez directement votre itinéraire."
        subtitle={seesAll ? "Tous les entretiens géolocalisés de votre entreprise." : "Vos entretiens géolocalisés."}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={`/app/map?date=${previous}`} className="btn-secondary px-3" aria-label="Jour précédent">←</Link>
        <Link href="/app/map" className="btn-secondary">Aujourd'hui</Link>
        <Link href={`/app/map?date=${next}`} className="btn-secondary px-3" aria-label="Jour suivant">→</Link>
        <h2 className="ml-2 font-semibold text-graphite-800">{formatDate(date)}</h2>
      </div>

      {geocodedCount === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-graphite-700">Aucun entretien localisé ce jour.</p>
          <p className="mt-2 text-sm text-graphite-500">Les entretiens apparaissent dès que l'adresse du client ou de la piscine possède des coordonnées GPS.</p>
        </div>
      ) : (
        <>
          {occurrences.length > geocodedCount && <p className="mb-3 text-xs text-amber-600">{occurrences.length - geocodedCount} entretien(s) non affiché(s) : adresse sans coordonnées.</p>}
          <ServiceMap points={points} assignees={assignees} showAssigneeFilter={seesAll} />
        </>
      )}
    </div>
  );
}
