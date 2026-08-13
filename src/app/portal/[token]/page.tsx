import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalSession } from "@/lib/portal";
import { closePortal } from "@/lib/actions/portal";
import { Logo } from "@/components/Logo";
import { PortalCodeForm } from "./PortalCodeForm";
import { clientName, formatDate, formatMoney, SERVICE_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/utils/format";

export default async function PortalPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, first_name, last_name, company_name, portal_enabled, status, workspace_id")
    .eq("portal_token", token)
    .maybeSingle();

  const invalid = !client || !client.portal_enabled || client.status !== "active";
  const cookieValue = cookies().get(portalCookieName(token))?.value;
  const authed = !invalid && verifyPortalSession(token, cookieValue, client!.id);

  // ---- Écran de saisie du code ----
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 px-5">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <div className="card p-8">
            <h1 className="text-xl font-bold text-graphite-900">Espace client</h1>
            <p className="mb-6 mt-1 text-sm text-graphite-500">
              {invalid ? "Ce lien n'est pas valide ou l'accès a été désactivé." : "Saisissez le code d'accès qui vous a été communiqué."}
            </p>
            {!invalid && <PortalCodeForm token={token} />}
          </div>
          <p className="mt-4 text-center text-xs text-graphite-400">Vous accédez uniquement à vos informations.</p>
        </div>
      </div>
    );
  }

  // ---- Données du client (portée stricte à ce client) ----
  const [{ data: pools }, { data: services }, { data: invoices }, { data: workspace }] = await Promise.all([
    admin.from("pools").select("id, name, pool_type, water_treatment").eq("client_id", client!.id),
    admin.from("services").select("id, scheduled_date, status, service_type").eq("client_id", client!.id).order("scheduled_date", { ascending: false }).limit(20),
    admin.from("invoices").select("id, number, status, total, issue_date").eq("client_id", client!.id).order("issue_date", { ascending: false }),
    admin.from("workspaces").select("name, phone, email").eq("id", client!.workspace_id).maybeSingle(),
  ]);

  const name = clientName(client!);
  const upcoming = (services ?? []).filter((s) => s.scheduled_date >= new Date().toISOString().slice(0, 10) && s.status !== "cancelled");
  const past = (services ?? []).filter((s) => s.scheduled_date < new Date().toISOString().slice(0, 10) || s.status === "completed");
  const closeAction = closePortal.bind(null, token);

  return (
    <div className="min-h-screen bg-graphite-50">
      <header className="border-b border-graphite-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm text-graphite-400">{workspace?.name}</div>
            <div className="font-semibold text-graphite-900">{name}</div>
          </div>
          <form action={closeAction}><button className="btn-ghost text-sm">Se déconnecter</button></form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-graphite-900">Prochaines interventions</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-graphite-400">Aucune intervention planifiée.</p>
          ) : (
            <ul className="divide-y divide-graphite-100">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-graphite-900">{s.service_type ?? "Intervention"}</div>
                    <div className="text-sm text-graphite-500">{formatDate(s.scheduled_date)}</div>
                  </div>
                  <span className="badge bg-pool-50 text-pool-700">{SERVICE_STATUS_LABELS[s.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(pools ?? []).length > 0 && (
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Mes piscines</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(pools ?? []).map((p) => (
                <div key={p.id} className="rounded-xl bg-graphite-50 p-4">
                  <div className="font-medium text-graphite-900">{p.name}</div>
                  <div className="text-sm text-graphite-500">{[p.pool_type, p.water_treatment].filter(Boolean).join(" · ") || "—"}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Historique</h2>
            <ul className="divide-y divide-graphite-100">
              {past.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-graphite-700">{formatDate(s.scheduled_date)} · {s.service_type ?? "Intervention"}</span>
                  <span className="badge bg-emerald-50 text-emerald-700">{SERVICE_STATUS_LABELS[s.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(invoices ?? []).length > 0 && (
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Mes factures</h2>
            <ul className="divide-y divide-graphite-100">
              {(invoices ?? []).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-mono text-graphite-700">{i.number} · {formatDate(i.issue_date)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{formatMoney(i.total)}</span>
                    <span className="badge bg-graphite-100 text-graphite-600">{INVOICE_STATUS_LABELS[i.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-graphite-400">
          Une question ? Contactez {workspace?.name} {workspace?.phone ? `au ${workspace.phone}` : ""}.
        </p>
      </main>
    </div>
  );
}
