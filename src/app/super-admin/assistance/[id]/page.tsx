import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientName, formatDateTime } from "@/lib/utils/format";
import { CATEGORY_BY_KEY, STATUS_BY_KEY } from "@/lib/assistance";
import type { SupportCategory, SupportStatus } from "@/lib/db/types";
import { ConversationActions } from "./ConversationActions";

export const dynamic = "force-dynamic";

export default async function SuperAdminConversationPage({ params }: { params: { id: string } }) {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: conv } = await admin
    .from("support_conversations")
    .select("id, workspace_id, client_id, membership_id, category, status, context, created_at, resolved_at, clients(first_name,last_name,company_name,email,phone), memberships(first_name,last_name,email), workspaces(name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!conv) notFound();

  // Marque la conversation comme vue par le Super Admin (retire le badge d'attention).
  await admin.from("support_conversations").update({ admin_last_seen_at: new Date().toISOString() }).eq("id", conv.id);

  const { data: messages } = await admin
    .from("support_messages")
    .select("id, author_type, author_label, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  const cat = CATEGORY_BY_KEY[conv.category as SupportCategory];
  const st = STATUS_BY_KEY[conv.status as SupportStatus];
  const clientRel = conv.clients as unknown as { first_name: string | null; last_name: string | null; company_name: string | null; email: string | null; phone: string | null } | null;
  const membershipRel = conv.memberships as unknown as { first_name: string | null; last_name: string | null; email: string | null } | null;
  const wsRel = conv.workspaces as unknown as { name: string | null } | null;
  // client_id reste renseigné pour le portail ; membership_id peut être nul après
  // la suppression d'un compte sans changer l'origine de la conversation.
  const requesterType = conv.client_id ? "client" : "user";
  const requester = requesterType === "user"
    ? [membershipRel?.first_name, membershipRel?.last_name].filter(Boolean).join(" ") || membershipRel?.email || "Utilisateur inconnu"
    : clientRel ? clientName(clientRel) : "Client inconnu";
  const requesterEmail = requesterType === "user" ? membershipRel?.email : clientRel?.email;
  const context = (conv.context ?? {}) as Record<string, unknown>;
  const serviceCode = typeof context.service_code === "string" ? context.service_code : null;
  const route = typeof context.route === "string" ? context.route : null;
  const device = typeof context.device === "string" ? context.device : null;

  return (
    <div className="min-h-screen bg-graphite-950 text-graphite-100">
      <header className="border-b border-graphite-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/super-admin" className="text-graphite-400 hover:text-graphite-200">🛡️ Super Admin</Link>
            <span className="text-graphite-600">/</span>
            <Link href="/super-admin/assistance" className="text-graphite-400 hover:text-graphite-200">💬 Assistance</Link>
            <span className="text-graphite-600">/</span>
            <span>Conversation</span>
          </div>
          <Link href="/super-admin/assistance" className="rounded-lg bg-graphite-800 px-3 py-1.5 text-sm text-graphite-100 hover:bg-graphite-700">← Retour</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-5 py-8 lg:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <div className="order-2 lg:order-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`badge ${st.tone}`}>{st.emoji} {st.label}</span>
            <span className="badge bg-graphite-800 text-graphite-200">{cat.emoji} {cat.label}</span>
          </div>

          <div className="space-y-3 rounded-2xl border border-graphite-800 bg-graphite-900 p-4">
            {(messages ?? []).map((m) => (
              <div key={m.id} className={`flex ${m.author_type === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.author_type === "admin" ? "rounded-br-sm bg-pool-600 text-white" : "rounded-bl-sm bg-graphite-800 text-graphite-100"
                }`}>
                  <div className={`mb-0.5 text-[11px] font-semibold ${m.author_type === "admin" ? "text-pool-100" : "text-pool-300"}`}>
                    {m.author_type === "admin" ? "Vous (Assistance)" : (m.author_label ?? (requesterType === "user" ? "Utilisateur" : "Client"))}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={`mt-1 text-[10px] ${m.author_type === "admin" ? "text-pool-200" : "text-graphite-500"}`}>{formatDateTime(m.created_at)}</div>
                </div>
              </div>
            ))}
            {(messages ?? []).length === 0 && <p className="text-sm text-graphite-500">Aucun message.</p>}
          </div>

          <div className="mt-5 rounded-2xl border border-graphite-800 bg-graphite-900 p-4">
            <ConversationActions conversationId={conv.id} status={conv.status as SupportStatus} />
          </div>
        </div>

        {/* Informations / contexte */}
        <aside className="order-1 space-y-3 lg:order-2">
          <div className="rounded-2xl border border-graphite-800 bg-graphite-900 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-graphite-400">Informations</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Entreprise" value={wsRel?.name ?? "—"} />
              <Info label={requesterType === "user" ? "Utilisateur" : "Client"} value={requester} />
              <Info label="Origine" value={requesterType === "user" ? "Application Piscine Island" : "Portail client"} />
              {requesterEmail && <Info label="E-mail" value={requesterEmail} />}
              {requesterType === "client" && clientRel?.phone && <Info label="Téléphone" value={clientRel.phone} />}
              <Info label="Catégorie" value={`${cat.emoji} ${cat.label}`} />
              <Info label="Statut" value={`${st.emoji} ${st.label}`} />
              <Info label="Créée le" value={formatDateTime(conv.created_at)} />
              {conv.resolved_at && <Info label="Résolue le" value={formatDateTime(conv.resolved_at)} />}
            </dl>
          </div>

          <div className="rounded-2xl border border-graphite-800 bg-graphite-900 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-graphite-400">Contexte</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Prestation" value={serviceCode ?? "—"} highlight={!!serviceCode} />
              <Info label="Page" value={route ?? "—"} />
              <Info label="Appareil" value={device ?? "—"} />
            </dl>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-graphite-500">{label}</dt>
      <dd className={`text-right ${highlight ? "font-mono font-semibold text-pool-300" : "text-graphite-200"}`}>{value}</dd>
    </div>
  );
}
