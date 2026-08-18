import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { clientName, memberName, formatDate, formatTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui";
import { ServiceMap, type MapPoint, type MapService } from "./ServiceMap";

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
        "client_id, " +
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

  const pointByAddress = new Map<string, MapPoint>();
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

    const service: MapService = {
      id: s.id,
      code: s.code,
      serviceType: s.service_type ?? "Prestation",
      date: formatDate(s.scheduled_date),
      time: formatTime(s.scheduled_time),
      sortKey: `${s.scheduled_date} ${s.scheduled_time ?? ""}`,
      status: s.status,
      assigneeId: s.assigned_membership_id,
      assignee,
    };
    // Un point représente une adresse/client. Les prestations liées partagent
    // donc le même marqueur, y compris lorsqu'elles sont passées ou à venir.
    const pointKey = [s.client_id, Number(lat).toFixed(6), Number(lng).toFixed(6), address].join(":");
    const existing = pointByAddress.get(pointKey);
    if (existing) {
      existing.services.push(service);
    } else {
      pointByAddress.set(pointKey, {
        id: pointKey,
        lat: Number(lat),
        lng: Number(lng),
        client: clientName(client ?? {}),
        address,
        services: [service],
      });
    }
  }

  const points = Array.from(pointByAddress.values()).map((point) => ({
    ...point,
    services: [...point.services].sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
  }));
  const assignees = Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }));
  const geocodedCount = points.reduce((count, point) => count + point.services.length, 0);
  const totalCount = (services ?? []).length;

  return (
    <div>
      <PageHeader
        title="Carte des prestations"
        description="Visualisez géographiquement vos clients et leurs différentes prestations."
        subtitle={seesAll ? "Toutes les prestations géolocalisées de votre entreprise." : "Vos prestations géolocalisées."}
      />

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
