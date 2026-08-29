import { requireContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { MemberIdentity } from "@/components/members/MemberIdentity";
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
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, summary, actor_label, created_at, actor:memberships!activity_logs_actor_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const actorFor = (log: any) => Array.isArray(log.actor) ? log.actor[0] ?? null : log.actor;
  const actorByPath = await signedUrls("avatars", (logs ?? []).map((log: any) => actorFor(log)?.photo_path));

  return (
    <div>
      <PageHeader title="Journal d'activité" description="Consultez l'historique des actions importantes de votre espace." />
      {!logs || logs.length === 0 ? (
        <EmptyState title="Aucune activité" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-graphite-100">
            {logs.map((l) => {
              const actor = actorFor(l);
              return (
              <li key={l.id} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                <span className="mt-0.5 badge bg-graphite-100 text-graphite-600">{ACTION_LABELS[l.action] ?? l.action}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-graphite-800">{l.summary ?? l.entity_type ?? "—"}</div>
                  {actor ? (
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <MemberIdentity member={actor} avatarUrl={actor.photo_path ? actorByPath.get(actor.photo_path) : null} avatarSize={26} nameClassName="text-xs text-graphite-700" />
                      <time className="text-xs text-graphite-400">{formatDateTime(l.created_at)}</time>
                    </div>
                  ) : (
                    <div className="text-xs text-graphite-400">{l.actor_label ?? "—"} · {formatDateTime(l.created_at)}</div>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
