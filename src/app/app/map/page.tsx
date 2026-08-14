import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { clientName, memberName, formatDate, formatTime } from "@/lib/utils/format";
import { ServiceMap, type MapPoint } from "./ServiceMap";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const ctx = await requirePermission("map.view");
  const supabase = createClient();

  // Un admin (ou un membre pouvant éditer les prestations) voit tout le workspace ;
  // un employé/prestataire ne voit que les prestations qui lui sont assignées.
  const seesAll = ctx.isAdmin || can(ctx, "services.edit");

  let query = supabase
    .from("services")
    .select(
      "id, code, service_type, scheduled_date, scheduled_time, status, assigned_membership_id, " +
        "client:clients(first_name,last_name,company_name,address_line1,postal_code,city,latitude,longitude), " +
        "pool:pools(name,address_line1,postal_code,city,latitude,longitude), " +
        "assignee:memberships!services_assigned_membership_id_fkey(first_name,last_name,email)"
    )
    .eq("workspace_id", ctx.workspace.id)
    .neq("status", "cancelled");

  if (!seesAll) {
    query = query.eq("assigned_membership_id", ctx.membership.id);
  }

  const { data: services } = await query;

  const points: MapPoint[] = [];
  const assigneeMap = new Map<string, string>();

  for (const s of (services ?? []) as any[]) {
    const pool = s.pool;
    const client = s.client;
    // La piscine peut avoir sa propre localisation ; sinon on prend celle du client.
    const lat = pool?.latitude ?? client?.latitude ?? null;
    const lng = pool?.longitude ?? client?.longitude ?? null;
    if (lat === null || lng === null) continue; // pas encore géocodé → non affiché

    const address =
      [pool?.address_line1, pool?.postal_code, pool?.city].filter(Boolean).join(", ") ||
      [client?.address_line1, client?.postal_code, client?.city].filter(Boolean).join(", ");

    const assignee = s.assignee ? memberName(s.assignee) : "";
    if (s.assigned_membership_id && assignee) {
      assigneeMap.set(s.assigned_membership_id, assignee);
    }

    points.push({
      id: s.id,
      lat: Number(lat),
      lng: Number(lng),
      code: s.code,
      serviceType: s.service_type ?? "Prestation",
      client: clientName(client ?? {}),
      address,
      date: formatDate(s.scheduled_date),
      time: formatTime(s.scheduled_time),
      status: s.status,
      assigneeId: s.assigned_membership_id,
      assignee,
    });
  }

  const assignees = Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }));
  const geocodedCount = points.length;
  const totalCount = (services ?? []).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-graphite-900">Carte des prestations</h1>
        <p className="mt-1 text-sm text-graphite-500">
          {seesAll
            ? "Toutes les prestations géolocalisées du workspace."
            : "Vos prestations géolocalisées."}
        </p>
      </div>

      {geocodedCount === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-graphite-700">Aucune prestation localisée pour le moment.</p>
          <p className="mt-2 text-sm text-graphite-500">
            Les prestations apparaissent ici dès que l'adresse de leur client (ou de la piscine) est
            renseignée via l'autocomplétion d'adresse — les coordonnées GPS sont alors enregistrées
            automatiquement.
          </p>
        </div>
      ) : (
        <>
          {totalCount > geocodedCount && (
            <p className="mb-3 text-xs text-amber-600">
              {totalCount - geocodedCount} prestation(s) non affichée(s) : adresse client sans
              coordonnées. Ouvrez la fiche client et re-sélectionnez l'adresse pour la localiser.
            </p>
          )}
          <ServiceMap points={points} assignees={assignees} showAssigneeFilter={seesAll} />
        </>
      )}
    </div>
  );
}
