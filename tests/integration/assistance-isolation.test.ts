import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Isolation multi-tenant du module Assistance (RLS).
 * Vérifie qu'un utilisateur d'un workspace ne peut jamais voir/écrire les
 * conversations d'assistance d'un autre workspace, ni écrire côté client
 * (les écritures passent uniquement par service_role).
 *
 * Nécessite : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Sinon le test est ignoré.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const READY = Boolean(URL && ANON && SERVICE);

const admin = READY ? createClient(URL!, SERVICE!, { auth: { persistSession: false } }) : null;

const rnd = Math.random().toString(36).slice(2, 8);
const A = { email: `sup-a-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "", convId: "" };
const B = { email: `sup-b-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "", convId: "" };

async function setupTenant(t: typeof A, name: string) {
  const { data: created } = await admin!.auth.admin.createUser({ email: t.email, password: t.password, email_confirm: true });
  t.userId = created!.user!.id;
  const { data: prov } = await admin!.rpc("provision_workspace", {
    p_user_id: t.userId, p_company_name: name, p_admin_first: "T", p_admin_last: name, p_admin_email: t.email,
  });
  t.workspaceId = (Array.isArray(prov) ? prov[0] : prov).workspace_id;
  const { data: client } = await admin!.from("clients").insert({ workspace_id: t.workspaceId, first_name: "Client", last_name: name }).select("id").single();
  t.clientId = client!.id;
  const { data: conv } = await admin!
    .from("support_conversations")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, category: "bug", status: "new" })
    .select("id").single();
  t.convId = conv!.id;
  await admin!.from("support_messages").insert({
    conversation_id: t.convId, workspace_id: t.workspaceId, author_type: "client", author_label: name, content: `Message secret de ${name}`,
  });
}

describe.skipIf(!READY)("Isolation Assistance (RLS)", () => {
  beforeAll(async () => {
    await setupTenant(A, "SupTenantA");
    await setupTenant(B, "SupTenantB");
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from("workspaces").delete().eq("id", A.workspaceId);
    await admin.from("workspaces").delete().eq("id", B.workspaceId);
    await admin.auth.admin.deleteUser(A.userId).catch(() => {});
    await admin.auth.admin.deleteUser(B.userId).catch(() => {});
  }, 30000);

  it("un membre ne voit que les conversations de son workspace", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data } = await asA.from("support_conversations").select("id, workspace_id");
    expect(data).toBeTruthy();
    for (const c of data!) expect(c.workspace_id).toBe(A.workspaceId);
    expect(data!.some((c) => c.id === B.convId)).toBe(false);
  });

  it("l'accès direct par ID à la conversation d'un autre workspace est bloqué", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data } = await asA.from("support_conversations").select("*").eq("id", B.convId).maybeSingle();
    expect(data).toBeNull();
  });

  it("les messages d'un autre workspace ne sont jamais visibles", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data } = await asA.from("support_messages").select("id, workspace_id");
    for (const m of data ?? []) expect(m.workspace_id).toBe(A.workspaceId);
  });

  it("un utilisateur authentifié ne peut pas écrire de message (écriture réservée au serveur)", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data, error } = await asA.from("support_messages").insert({
      conversation_id: A.convId, workspace_id: A.workspaceId, author_type: "client", content: "Tentative directe",
    }).select("id");
    // Aucune policy INSERT → refus.
    expect(!data || data.length === 0 || !!error).toBe(true);
  });

  it("un utilisateur ne peut pas usurper le workspace d'autrui pour écrire", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data, error } = await asA.from("support_conversations").insert({
      workspace_id: B.workspaceId, client_id: B.clientId, category: "bug", status: "new",
    }).select("id");
    expect(!data || data.length === 0 || !!error).toBe(true);
  });

  it("un visiteur anonyme ne voit aucune conversation", async () => {
    const anon = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const { data } = await anon.from("support_conversations").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
