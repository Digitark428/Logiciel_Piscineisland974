import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOutSuperAdmin } from "@/lib/actions/superadmin";
import { getSupportAttentionCount } from "@/lib/assistance-admin";
import { Badge } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { formatDate } from "@/lib/utils/format";
import { WorkspaceActions } from "./WorkspaceActions";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboard() {
  const sa = await requireSuperAdmin();
  const admin = createAdminClient();
  const supportAttention = await getSupportAttentionCount();

  const [{ data: workspaces }, wsCount, userCount, { data: recent }] = await Promise.all([
    admin.from("workspaces").select("id, name, company_code, status, city, created_at").order("created_at", { ascending: false }),
    admin.from("workspaces").select("id", { count: "exact", head: true }),
    admin.from("memberships").select("id", { count: "exact", head: true }),
    admin.from("activity_logs").select("id, action, summary, actor_label, created_at, workspace_id").order("created_at", { ascending: false }).limit(15),
  ]);

  const list = workspaces ?? [];
  const active = list.filter((w) => w.status === "active").length;

  return (
    <div className="min-h-screen bg-graphite-50 text-graphite-900">
      <header className="border-b border-graphite-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 text-sm font-semibold"><Logo showText={false} /> <span>Administration LETI</span></div>
          <div className="flex items-center gap-3 text-sm text-graphite-500">
            <Link href="/super-admin/assistance" className="btn-secondary min-h-0 gap-1.5 px-3 py-1.5">
              💬 Assistance
              {supportAttention > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1.5 text-xs font-bold text-graphite-900">{supportAttention}</span>
              )}
            </Link>
            <span className="hidden sm:inline">{sa.email}</span>
            <form action={signOutSuperAdmin}><button className="btn-ghost min-h-0 px-3 py-1.5">Déconnexion</button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Espaces" value={wsCount.count ?? 0} />
          <Stat label="Espaces actifs" value={active} />
          <Stat label="Utilisateurs" value={userCount.count ?? 0} />
        </div>

        <h2 className="leti-eyebrow mb-3">Espaces</h2>
        <div className="overflow-x-auto rounded-2xl border border-graphite-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 text-left text-graphite-500">
                <th className="px-4 py-3 font-medium">Entreprise</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Créé</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id} className="border-b border-graphite-100 transition hover:bg-graphite-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-graphite-900">{w.name}</div>
                    <div className="text-xs text-graphite-500">{w.city ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-graphite-500">{w.company_code}</td>
                  <td className="px-4 py-3 text-graphite-500">{formatDate(w.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={w.status === "active" ? "active" : "disabled"}>{w.status === "active" ? "Actif" : "Désactivé"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <WorkspaceActions id={w.id} name={w.name} status={w.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="leti-eyebrow mb-3 mt-8">Activité globale récente</h2>
        <div className="card p-4">
          <ul className="space-y-2 text-sm">
            {(recent ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-graphite-800">{a.summary ?? a.action}</span>
                <span className="text-xs text-graphite-400">{a.actor_label ?? "—"} · {formatDate(a.created_at)}</span>
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
    <div className="card p-5">
      <div className="text-sm text-graphite-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-graphite-900">{value}</div>
    </div>
  );
}
