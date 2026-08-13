import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Test d'isolation multi-tenant (RLS).
 * Vérifie qu'un utilisateur d'un workspace ne peut JAMAIS accéder aux données d'un autre.
 *
 * Nécessite une vraie instance Supabase (migrations appliquées) et :
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Sinon le test est ignoré.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const READY = Boolean(URL && ANON && SERVICE);

const admin = READY ? createClient(URL!, SERVICE!, { auth: { persistSession: false } }) : null;

const rnd = Math.random().toString(36).slice(2, 8);
const A = { email: `iso-a-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "" };
const B = { email: `iso-b-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "" };

async function setupTenant(t: typeof A, name: string) {
  const { data: created } = await admin!.auth.admin.createUser({ email: t.email, password: t.password, email_confirm: true });
  t.userId = created!.user!.id;
  const { data: prov } = await admin!.rpc("provision_workspace", {
    p_user_id: t.userId, p_company_name: name, p_admin_first: "T", p_admin_last: name, p_admin_email: t.email,
  });
  t.workspaceId = (Array.isArray(prov) ? prov[0] : prov).workspace_id;
  const { data: client } = await admin!.from("clients").insert({ workspace_id: t.workspaceId, first_name: "Secret", last_name: name }).select("id").single();
  t.clientId = client!.id;
}

describe.skipIf(!READY)("Isolation multi-tenant (RLS)", () => {
  beforeAll(async () => {
    await setupTenant(A, "TenantA");
    await setupTenant(B, "TenantB");
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from("workspaces").delete().eq("id", A.workspaceId);
    await admin.from("workspaces").delete().eq("id", B.workspaceId);
    await admin.auth.admin.deleteUser(A.userId).catch(() => {});
    await admin.auth.admin.deleteUser(B.userId).catch(() => {});
  }, 30000);

  it("un utilisateur ne voit que les clients de son workspace", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });

    const { data: visible } = await asA.from("clients").select("id, workspace_id");
    expect(visible).toBeTruthy();
    // Tous les clients visibles appartiennent au workspace A.
    for (const c of visible!) expect(c.workspace_id).toBe(A.workspaceId);
    // Le client de B n'est jamais visible.
    expect(visible!.some((c) => c.id === B.clientId)).toBe(false);
  });

  it("l'accès direct par ID au client d'un autre workspace est bloqué", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data } = await asA.from("clients").select("*").eq("id", B.clientId).maybeSingle();
    expect(data).toBeNull();
  });

  it("l'écriture dans un autre workspace est refusée", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });
    const { data, error } = await asA.from("clients").insert({ workspace_id: B.workspaceId, first_name: "Intrus" }).select("id");
    // RLS doit refuser l'insertion dans le workspace de B.
    expect(!data || data.length === 0 || !!error).toBe(true);
  });
});
