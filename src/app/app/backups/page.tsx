import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { formatBytes } from "@/lib/utils/format";
import {
  BackupAutoRefresh,
  BackupRow,
  DownloadButton,
  ManualBackupButton,
  backupDateTime,
  type BackupListItem,
} from "./BackupsClient";

const PAGE_SIZE = 50;
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function pageNumber(raw: string | undefined): number {
  const value = Number(raw ?? "1");
  return Number.isInteger(value) && value > 0 ? Math.min(value, 10_000) : 1;
}

function localYearMonth(value: string, timeZone: string): { year: string; month: string; monthIndex: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "—";
  const monthIndex = Number(parts.find((part) => part.type === "month")?.value ?? "1") - 1;
  return { year, month: MONTHS[monthIndex] ?? "Mois inconnu", monthIndex };
}

export default async function BackupsPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await searchParamsPromise;
  const ctx = await requireContext();
  if (!ctx.isAdmin) redirect("/app");
  const supabase = await createClient();
  const page = pageNumber(searchParams.page);
  const from = (page - 1) * PAGE_SIZE;
  const timeZone = ctx.workspace.timezone ?? "Indian/Reunion";
  const selection = "id, kind, status, progress_stage, size_bytes, storage_path, file_name, mime_type, failure_message, created_at, completed_at";
  const [{ data, count }, { data: latestData }] = await Promise.all([
    supabase
      .from("backups")
      .select(selection, { count: "exact" })
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("backups")
      .select(selection)
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "completed")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const list = (data ?? []) as BackupListItem[];
  const latest = latestData as BackupListItem | null;
  const now = Date.now();
  const active = list.some((backup) => backup.status === "running"
    || (backup.status === "queued" && new Date(backup.created_at).getTime() <= now + 60_000));
  const wakeAt = list
    .filter((backup) => backup.status === "queued" && new Date(backup.created_at).getTime() > now + 60_000)
    .map((backup) => backup.created_at)
    .sort()[0] ?? null;
  const groups = new Map<string, Map<string, BackupListItem[]>>();
  for (const backup of list) {
    const local = localYearMonth(backup.created_at, timeZone);
    const yearMonths = groups.get(local.year) ?? new Map<string, BackupListItem[]>();
    const key = `${String(local.monthIndex).padStart(2, "0")}-${local.month}`;
    yearMonths.set(key, [...(yearMonths.get(key) ?? []), backup]);
    groups.set(local.year, yearMonths);
  }
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <BackupAutoRefresh active={active} wakeAt={wakeAt} />
      <PageHeader
        title="Sauvegardes"
        description="Créez et téléchargez un dossier complet contenant un PDF professionnel, un classeur XLSX, la galerie et les documents associés."
        subtitle={`Sauvegarde automatique quotidienne à 21h00 (${timeZone}). Aucune suppression automatique.`}
        action={<ManualBackupButton />}
      />

      <Card className="mb-6 border-pool-200 bg-pool-50/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-pool-700">Dernière sauvegarde disponible</p>
            {latest ? (
              <>
                <p className="mt-1 text-lg font-bold text-graphite-900">{backupDateTime(latest.created_at, timeZone)}</p>
                <p className="text-xs text-graphite-500">{formatBytes(latest.size_bytes)} · {latest.mime_type === "application/json" ? "Ancien format JSON" : "Archive ZIP complète"}</p>
              </>
            ) : <p className="mt-1 text-sm text-graphite-500">Aucune sauvegarde disponible pour le moment.</p>}
          </div>
          {latest ? <DownloadButton backupId={latest.id} label="Télécharger la dernière" /> : null}
        </div>
      </Card>

      {list.length === 0 ? (
        <Card><p className="py-8 text-center text-sm text-graphite-400">Aucune sauvegarde pour le moment.</p></Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([year, months]) => (
            <section key={year}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-graphite-400">{year}</h2>
              <div className="space-y-4">
                {Array.from(months.entries()).map(([monthKey, items]) => (
                  <Card key={monthKey} className="overflow-hidden p-0">
                    <div className="border-b border-graphite-100 bg-graphite-50 px-4 py-2 text-sm font-medium text-graphite-600 sm:px-6">{monthKey.slice(3)}</div>
                    <ul className="divide-y divide-graphite-100">
                      {items.map((backup) => <BackupRow key={backup.id} backup={backup} timeZone={timeZone} />)}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-7 flex items-center justify-between" aria-label="Pagination des sauvegardes">
          {page > 1 ? <Link href={`/app/backups?page=${page - 1}`} className="btn-secondary">← Plus récentes</Link> : <span />}
          <span className="text-xs text-graphite-400">Page {page} sur {totalPages}</span>
          {page < totalPages ? <Link href={`/app/backups?page=${page + 1}`} className="btn-secondary">Plus anciennes →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
