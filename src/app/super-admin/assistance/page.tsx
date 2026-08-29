import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { getSupportOverview } from "@/lib/assistance-admin";
import { CATEGORY_BY_KEY, STATUS_BY_KEY, SUPPORT_CATEGORIES, SUPPORT_STATUSES } from "@/lib/assistance";
import { formatDateTime } from "@/lib/utils/format";
import { isSupportCategory, isSupportStatus } from "@/lib/assistance";

export const dynamic = "force-dynamic";

const SELECT_CLS = "input min-h-10 py-2";

interface SearchParams {
  status?: string;
  category?: string;
  company?: string;
  q?: string;
}

export default async function SuperAdminAssistancePage({ searchParams: searchParamsPromise }: { searchParams: Promise<SearchParams> }) {
  const searchParams = await searchParamsPromise;
  await requireSuperAdmin();
  const { conversations, stats } = await getSupportOverview();

  const fStatus = isSupportStatus(searchParams.status) ? searchParams.status : "";
  const fCategory = isSupportCategory(searchParams.category) ? searchParams.category : "";
  const fCompany = (searchParams.company ?? "").trim();
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const companies = Array.from(new Set(conversations.map((c) => c.company))).sort();

  const filtered = conversations.filter((c) => {
    if (fStatus && c.status !== fStatus) return false;
    if (fCategory && c.category !== fCategory) return false;
    if (fCompany && c.company !== fCompany) return false;
    if (q) {
      const hay = `${c.company} ${c.requester} ${c.preview} ${c.lastMessage}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-graphite-50 text-graphite-900">
      <header className="border-b border-graphite-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/super-admin" className="text-graphite-600 hover:text-graphite-900">Administration LETI</Link>
            <span className="text-graphite-300">/</span>
            <span>Assistance</span>
          </div>
          <Link href="/super-admin" className="btn-secondary min-h-0 px-3 py-1.5">← Tableau de bord</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Statistiques */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Total" value={stats.total} />
          <Stat label="🔴 Nouveaux" value={stats.new} tone={stats.new > 0 ? "red" : undefined} />
          <Stat label="🟠 En cours" value={stats.in_progress} />
          <Stat label="🟢 Résolus" value={stats.resolved} />
          <Stat label="🐛 Bugs" value={stats.bug} />
          <Stat label="❓ Aide" value={stats.help} />
          <Stat label="💡 Suggestions" value={stats.suggestion} />
        </div>

        {/* Filtres */}
        <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
          <Field label="Statut">
            <select name="status" defaultValue={fStatus} className={SELECT_CLS}>
              <option value="">Tous</option>
              {SUPPORT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
            </select>
          </Field>
          <Field label="Catégorie">
            <select name="category" defaultValue={fCategory} className={SELECT_CLS}>
              <option value="">Toutes</option>
              {SUPPORT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
          </Field>
          <Field label="Entreprise">
            <select name="company" defaultValue={fCompany} className={SELECT_CLS}>
              <option value="">Toutes</option>
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Recherche">
            <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Message, demandeur…" className={SELECT_CLS} />
          </Field>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary min-h-10 px-4 py-2">Filtrer</button>
            <Link href="/super-admin/assistance" className="btn-secondary min-h-10 px-4 py-2">Réinitialiser</Link>
          </div>
        </form>

        {/* Liste */}
        <div className="overflow-hidden rounded-2xl border border-graphite-200 bg-white shadow-card">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-graphite-500">Aucune demande ne correspond.</div>
          ) : (
            <ul className="divide-y divide-graphite-100">
              {filtered.map((c) => {
                const cat = CATEGORY_BY_KEY[c.category];
                const st = STATUS_BY_KEY[c.status];
                return (
                  <li key={c.id}>
                    <Link href={`/super-admin/assistance/${c.id}`} className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-graphite-50">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`badge ${st.tone}`}>{st.emoji} {st.label}</span>
                          <span className="badge bg-graphite-100 text-graphite-600">{cat.emoji} {cat.label}</span>
                          <span className="font-medium text-graphite-800">{c.company}</span>
                          <span className="text-graphite-400">·</span>
                          <span className={`badge ${c.requesterType === "user" ? "bg-pool-50 text-pool-800" : "bg-graphite-100 text-graphite-600"}`}>
                            {c.requesterType === "user" ? "👤 Utilisateur app" : "👥 Client portail"}
                          </span>
                          <span className="text-graphite-500">{c.requester}</span>
                          {c.adminUnread > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-graphite-900">{c.adminUnread}</span>}
                        </div>
                        <div className="truncate text-sm text-graphite-700">
                          {c.lastAuthor === "admin" ? <span className="text-graphite-400">Vous : </span> : null}{c.lastMessage || c.preview}
                        </div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-right text-xs text-graphite-400">{formatDateTime(c.last_message_at)}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "red" }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-graphite-500">{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold ${tone === "red" ? "text-red-600" : "text-graphite-900"}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-graphite-600">
      <span>{label}</span>
      {children}
    </label>
  );
}
