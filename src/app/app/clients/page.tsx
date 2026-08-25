import Link from "next/link";
import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState, Badge, Avatar } from "@/components/ui";
import { clientName } from "@/lib/utils/format";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; archived?: string };
}) {
  const ctx = await requirePermission("clients.view");
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();
  const showArchived = searchParams.archived === "1";

  let query = supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, city, phone, email, status")
    .eq("workspace_id", ctx.workspace.id)
    .eq("status", showArchived ? "archived" : "active")
    .order("last_name", { nullsFirst: false })
    .order("company_name", { nullsFirst: false });

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,city.ilike.%${q}%`,
    );
  }
  const { data: clients } = await query;

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Consultez et gérez les coordonnées et informations de vos clients."
        subtitle={`${clients?.length ?? 0} ${showArchived ? "archivé(s)" : "actif(s)"}`}
        action={
          can(ctx, "clients.edit") ? (
            <Link prefetch={false} href="/app/clients/new" className="btn-primary">+ Nouveau client</Link>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form className="flex-1 min-w-[220px]">
          {showArchived && <input type="hidden" name="archived" value="1" />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un client…"
            className="input"
          />
        </form>
        <Link
          prefetch={false}
          href={showArchived ? "/app/clients" : "/app/clients?archived=1"}
          className="btn-secondary"
        >
          {showArchived ? "Voir les actifs" : "Voir les archivés"}
        </Link>
      </div>

      {!clients || clients.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description={q ? "Aucun résultat pour cette recherche." : "Commencez par créer votre premier client."}
          action={
            can(ctx, "clients.edit") && !q ? (
              <Link prefetch={false} href="/app/clients/new" className="btn-primary">+ Nouveau client</Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-graphite-100">
            {clients.map((c) => {
              const name = clientName(c);
              return (
                <li key={c.id}>
                  <Link prefetch={false} href={`/app/clients/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-graphite-50 sm:px-6">
                    <Avatar name={name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-graphite-900">{name}</div>
                      <div className="truncate text-sm text-graphite-500">
                        {[c.city, c.phone].filter(Boolean).join(" · ") || c.email || "—"}
                      </div>
                    </div>
                    {c.status === "archived" && <Badge tone="archived">Archivé</Badge>}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-graphite-300"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
