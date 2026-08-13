import { requireContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils/format";

const ACTION_LABELS: Record<string, string> = {
  login: "Connexion",
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  permissions_change: "Changement de permissions",
  seed: "Données de démonstration",
  backup: "Sauvegarde",
};

export default async function ActivityPage() {
  const ctx = await requireContext();
  if (!ctx.isAdmin) redirect("/app");
  const supabase = createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, summary, actor_label, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageHeader title="Journal d'activité" subtitle="Historique des actions importantes de votre espace." />
      {!logs || logs.length === 0 ? (
        <EmptyState title="Aucune activité" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-graphite-100">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                <span className="mt-0.5 badge bg-graphite-100 text-graphite-600">{ACTION_LABELS[l.action] ?? l.action}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-graphite-800">{l.summary ?? l.entity_type ?? "—"}</div>
                  <div className="text-xs text-graphite-400">{l.actor_label ?? "—"} · {formatDateTime(l.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
