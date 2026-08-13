import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOutSuperAdmin } from "@/lib/actions/superadmin";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils/format";
import { WorkspaceActions } from "./WorkspaceActions";

export default async function SuperAdminDashboard() {
  const sa = await requireSuperAdmin();
  const admin = createAdminClient();

  const [{ data: workspaces }, wsCount, userCount, { data: recent }] = await Promise.all([
    admin.from("workspaces").select("id, name, company_code, status, is_demo, city, created_at").order("created_at", { ascending: false }),
    admin.from("workspaces").select("id", { count: "exact", head: true }),
    admin.from("memberships").select("id", { count: "exact", head: true }),
    admin.from("activity_logs").select("id, action, summary, actor_label, created_at, workspace_id").order("created_at", { ascending: false }).limit(15),
  ]);

  const list = workspaces ?? [];
  const active = list.filter((w) => w.status === "active").length;

  return (
    <div className="min-h-screen bg-graphite-950 text-graphite-100">
      <header className="border-b border-graphite-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">🛡️ Super Admin</div>
          <div className="flex items-center gap-3 text-sm text-graphite-400">
            <span>{sa.email}</span>
            <form action={signOutSuperAdmin}><button className="rounded-lg bg-graphite-800 px-3 py-1.5 text-graphite-100 hover:bg-graphite-700">Déconnexion</button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-8 grid grid-cols-3 gap-4">
          <Stat label="Espaces" value={wsCount.count ?? 0} />
          <Stat label="Espaces actifs" value={active} />
          <Stat label="Utilisateurs" value={userCount.count ?? 0} />
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-graphite-400">Espaces</h2>
        <div className="overflow-x-auto rounded-2xl border border-graphite-800 bg-graphite-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-800 text-left text-graphite-500">
                <th className="px-4 py-3 font-medium">Entreprise</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Créé</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id} className="border-b border-graphite-800/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-graphite-100">{w.name}</div>
                    <div className="text-xs text-graphite-500">{w.city ?? ""}{w.is_demo ? " · Démo" : ""}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-graphite-400">{w.company_code}</td>
                  <td className="px-4 py-3 text-graphite-400">{formatDate(w.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={w.status === "active" ? "active" : "disabled"}>{w.status === "active" ? "Actif" : "Désactivé"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <WorkspaceActions id={w.id} name={w.name} status={w.status} isDemo={w.is_demo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-graphite-400">Activité globale récente</h2>
        <div className="rounded-2xl border border-graphite-800 bg-graphite-900 p-4">
          <ul className="space-y-2 text-sm">
            {(recent ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-graphite-200">{a.summary ?? a.action}</span>
                <span className="text-xs text-graphite-500">{a.actor_label ?? "—"} · {formatDate(a.created_at)}</span>
              </li>
            ))}
            {(recent ?? []).length === 0 && <li className="text-graphite-500">Aucune activité.</li>}
          </ul>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-graphite-800 bg-graphite-900 p-5">
      <div className="text-sm text-graphite-400">{label}</div>
      <div className="mt-1 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
