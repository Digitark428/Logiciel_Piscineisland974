import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { formatDateTime, formatBytes } from "@/lib/utils/format";
import { ManualBackupButton, DownloadButton, BackupRow } from "./BackupsClient";

export default async function BackupsPage() {
  const ctx = await requirePermission("backups.manage");
  const supabase = createClient();
  const { data: backups } = await supabase
    .from("backups")
    .select("id, kind, status, size_bytes, storage_path, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = backups ?? [];
  const latest = list.find((b) => b.status === "completed");

  // Regroupe par année → mois
  const groups = new Map<string, Map<string, any[]>>();
  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  for (const b of list) {
    const d = new Date(b.created_at);
    const y = String(d.getFullYear());
    const m = MONTHS[d.getMonth()];
    if (!groups.has(y)) groups.set(y, new Map());
    const ym = groups.get(y)!;
    if (!ym.has(m)) ym.set(m, []);
    ym.get(m)!.push(b);
  }

  return (
    <div>
      <PageHeader title="Sauvegardes" subtitle="Sauvegarde automatique quotidienne à 23h00 + sauvegarde manuelle." action={<ManualBackupButton />} />

      {latest && (
        <Card className="mb-6 border-pool-200 bg-pool-50/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-pool-700">Dernière sauvegarde</div>
              <div className="text-lg font-bold text-graphite-900">{formatDateTime(latest.created_at)}</div>
              <div className="text-xs text-graphite-500">{formatBytes(latest.size_bytes)}</div>
            </div>
            <DownloadButton backupId={latest.id} label="Télécharger" />
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-graphite-400">Aucune sauvegarde pour le moment.</p></Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([year, months]) => (
            <div key={year}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-graphite-400">{year}</h2>
              <div className="space-y-4">
                {Array.from(months.entries()).map(([month, items]) => (
                  <Card key={month} className="p-0 overflow-hidden">
                    <div className="border-b border-graphite-100 bg-graphite-50 px-4 py-2 text-sm font-medium text-graphite-600 sm:px-6">{month}</div>
                    <ul className="divide-y divide-graphite-100">
                      {items.map((b) => <BackupRow key={b.id} backup={b} />)}
                    </ul>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
