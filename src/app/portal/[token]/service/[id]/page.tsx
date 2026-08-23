import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalSession } from "@/lib/portal";
import { clientName, memberJobTitle, memberName, initials, formatDate, formatDate as fd, SERVICE_STATUS_LABELS } from "@/lib/utils/format";
import { serviceTypeLabel } from "@/lib/services/constants";
import { PortalServiceNote } from "./PortalServiceNote";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PortalServicePage({ params }: { params: { token: string; id: string } }) {
  const { token, id } = params;
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, first_name, last_name, company_name, portal_enabled, status, workspace_id")
    .eq("portal_token", token)
    .maybeSingle();

  const invalid = !client || !client.portal_enabled || client.status !== "active";
  const cookieValue = cookies().get(portalCookieName(token))?.value;
  const authed = !invalid && verifyPortalSession(token, cookieValue, client!.id);
  if (!authed) redirect(`/portal/${token}`);

  // Prestation — portée STRICTE au client (jamais celle d'un autre client).
  const { data: service } = await admin
    .from("services")
    .select("id, service_type, scheduled_date, scheduled_time, status, assigned_membership_id")
    .eq("id", id)
    .eq("client_id", client!.id)
    .eq("workspace_id", client!.workspace_id)
    .maybeSingle();
  if (!service) redirect(`/portal/${token}`);

  const [{ data: tasks }, { data: workspace }, { data: notes }] = await Promise.all([
    admin.from("service_tasks").select("id, label, done, position").eq("service_id", service.id).eq("workspace_id", client!.workspace_id).order("position"),
    admin.from("workspaces").select("name, phone, email, settings").eq("id", client!.workspace_id).maybeSingle(),
    admin
      .from("service_client_notes")
      .select("id, content, is_important, created_at")
      .eq("service_id", service.id)
      .eq("workspace_id", client!.workspace_id)
      .order("created_at", { ascending: false }),
  ]);

  // Intervenant assigné (photo + nom ; téléphone seulement si l'entreprise l'autorise).
  let assignee: { name: string; jobTitle: string | null; photoUrl: string | null; phone: string | null } | null = null;
  if (service.assigned_membership_id) {
    const { data: m } = await admin
      .from("memberships")
      .select("first_name, last_name, email, phone, role, job_title, photo_path")
      .eq("id", service.assigned_membership_id)
      .eq("workspace_id", client!.workspace_id)
      .maybeSingle();
    if (m) {
      let photoUrl: string | null = null;
      if (m.photo_path) {
        const { data: signed } = await admin.storage.from("avatars").createSignedUrl(m.photo_path, 3600);
        photoUrl = signed?.signedUrl ?? null;
      }
      const sharePhone = Boolean((workspace?.settings as Record<string, unknown>)?.portal_share_assignee_phone);
      assignee = { name: memberName(m), jobTitle: memberJobTitle(m), photoUrl, phone: sharePhone ? m.phone : null };
    }
  }

  // Gérant (admin) — contact principal pour les modifications importantes.
  const { data: managerRow } = await admin
    .from("memberships")
    .select("first_name, last_name, email, phone")
    .eq("workspace_id", client!.workspace_id)
    .eq("role", "admin")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const managerName = managerRow ? memberName(managerRow) : workspace?.name ?? "";
  const managerPhone = workspace?.phone ?? managerRow?.phone ?? null;
  const managerEmail = workspace?.email ?? null;

  const name = clientName(client!);
  const taskList = tasks ?? [];

  return (
    <div className="min-h-screen bg-graphite-50">
      <header className="border-b border-graphite-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Logo showText={false} />
            <div>
            <div className="text-sm text-graphite-400">{workspace?.name}</div>
            <div className="font-semibold text-graphite-900">{name}</div>
            </div>
          </div>
          <Link href={`/portal/${token}`} className="btn-ghost text-sm">← Retour</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 py-8">
        {/* Message d'accueil chaleureux + illustration sobre */}
        <section className="overflow-hidden rounded-2xl bg-graphite-900 p-6 text-white shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">Votre fiche d'intervention</h1>
              <p className="mt-1 text-sm text-white/90">
                Nous sommes heureux de prendre soin de votre piscine et de vous accompagner au quotidien.
              </p>
            </div>
            <svg width="72" height="56" viewBox="0 0 72 56" fill="none" className="shrink-0 opacity-90" aria-hidden>
              <circle cx="56" cy="14" r="8" fill="#fff" fillOpacity="0.5" />
              <path d="M2 34c5 0 5 4 10 4s5-4 10-4 5 4 10 4 5-4 10-4 5 4 10 4 5-4 10-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M2 44c5 0 5 4 10 4s5-4 10-4 5 4 10 4 5-4 10-4 5 4 10 4 5-4 10-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
            </svg>
          </div>
        </section>

        {/* Détails de l'intervention */}
        <section className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-graphite-400">Type de prestation</div>
              <h2 className="text-xl font-bold text-graphite-900">{serviceTypeLabel(service.service_type)}</h2>
            </div>
            <span className="badge bg-pool-50 text-pool-700">{SERVICE_STATUS_LABELS[service.status]}</span>
          </div>
          <div className="mt-3 text-sm text-graphite-600">
            <span className="font-medium">Date :</span> {formatDate(service.scheduled_date)}
            {service.scheduled_time ? ` à ${service.scheduled_time.slice(0, 5)}` : ""}
          </div>
        </section>

        {/* Tâches prévues */}
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-graphite-900">Tâches prévues</h2>
          {taskList.length === 0 ? (
            <p className="text-sm text-graphite-400">Aucune tâche détaillée pour cette intervention.</p>
          ) : (
            <ul className="space-y-2">
              {taskList.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-graphite-300 text-transparent"}`}>✓</span>
                  <span className={t.done ? "text-graphite-400 line-through" : "text-graphite-800"}>{t.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Intervenant */}
        {assignee && (
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Votre intervenant</h2>
            <div className="flex items-center gap-4">
              {assignee.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assignee.photoUrl} alt={assignee.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pool-100 font-semibold text-pool-700">{initials(assignee.name)}</div>
              )}
              <div>
                <div className="font-semibold text-graphite-900">{assignee.name}</div>
                {assignee.jobTitle && <div className="mt-1 inline-flex rounded-full bg-graphite-100 px-2 py-0.5 text-xs font-medium text-graphite-600">{assignee.jobTitle}</div>}
                {assignee.phone && (
                  <a href={`tel:${assignee.phone}`} className="text-sm text-pool-700">📞 {assignee.phone}</a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Contact du gérant — pour toute modification importante */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold text-graphite-900">Une question ou une modification ?</h2>
          <p className="mb-4 text-sm text-graphite-500">
            Pour une modification de rendez-vous, un changement important ou une demande administrative,
            contactez directement le gérant de votre entreprise.
          </p>
          <div className="rounded-xl bg-graphite-50 p-4 text-sm">
            <div className="font-medium text-graphite-900">{managerName}</div>
            {managerPhone && <div className="mt-1"><a href={`tel:${managerPhone}`} className="text-pool-700">📞 {managerPhone}</a></div>}
            {managerEmail && <div className="mt-0.5"><a href={`mailto:${managerEmail}`} className="text-pool-700">✉️ {managerEmail}</a></div>}
          </div>
        </section>

        {/* Notes du client */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-semibold text-graphite-900">Ajouter une note</h2>
          <p className="mb-4 text-sm text-graphite-500">
            Un changement d'accès, un nouveau code, une consigne ? Laissez une note : elle sera transmise à l'équipe.
          </p>
          <PortalServiceNote token={token} serviceId={service.id} />

          {(notes ?? []).length > 0 && (
            <ul className="mt-5 space-y-3 border-t border-graphite-100 pt-4">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg bg-graphite-50 p-3">
                  <div className="flex items-center gap-2 text-xs text-graphite-400">
                    <span>Note du client — {fd(n.created_at)}</span>
                    {n.is_important && <span className="badge bg-amber-100 text-amber-800">Information importante</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-graphite-800">{n.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
