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
const A = { email: `iso-a-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "", membershipId: "", poolId: "", serviceId: "", noteId: "" };
const B = { email: `iso-b-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "", membershipId: "", poolId: "", serviceId: "", noteId: "" };

async function setupTenant(t: typeof A, name: string) {
  const { data: created } = await admin!.auth.admin.createUser({ email: t.email, password: t.password, email_confirm: true });
  t.userId = created!.user!.id;
  const { data: prov } = await admin!.rpc("provision_workspace", {
    p_user_id: t.userId, p_company_name: name, p_admin_first: "T", p_admin_last: name, p_admin_email: t.email,
  });
  t.workspaceId = (Array.isArray(prov) ? prov[0] : prov).workspace_id;
  const { data: membership } = await admin!.from("memberships").select("id").eq("workspace_id", t.workspaceId).eq("user_id", t.userId).single();
  t.membershipId = membership!.id;
  const { data: client } = await admin!.from("clients").insert({ workspace_id: t.workspaceId, first_name: "Secret", last_name: name }).select("id").single();
  t.clientId = client!.id;
  const { data: pool } = await admin!.from("pools").insert({ workspace_id: t.workspaceId, client_id: t.clientId, name: "Pool" }).select("id").single();
  t.poolId = pool!.id;
  const { data: service } = await admin!.from("services").insert({ workspace_id: t.workspaceId, client_id: t.clientId, pool_id: t.poolId, assigned_membership_id: t.membershipId, scheduled_date: "2026-08-17" }).select("id").single();
  t.serviceId = service!.id;
  const { data: note } = await admin!.from("team_notes")
    .insert({ workspace_id: t.workspaceId, author_membership_id: t.membershipId, content: `Note privée ${name}` })
    .select("id")
    .single();
  t.noteId = note!.id;
  await admin!.from("team_note_reads").insert({ workspace_id: t.workspaceId, team_note_id: t.noteId, membership_id: t.membershipId });
  await admin!.from("team_note_executions").insert({ workspace_id: t.workspaceId, team_note_id: t.noteId, membership_id: t.membershipId });
  await admin!.from("team_note_comments").insert({ workspace_id: t.workspaceId, team_note_id: t.noteId, author_membership_id: t.membershipId, content: `Commentaire privé ${name}` });
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

  it("les garde-fous DB refusent les relations inter-workspace même avec service_role", async () => {
    const badPool = await admin!.from("pools").insert({ workspace_id: A.workspaceId, client_id: B.clientId, name: "Intrus" });
    expect(badPool.error).toBeTruthy();

    const badServiceClient = await admin!.from("services").insert({ workspace_id: A.workspaceId, client_id: B.clientId, scheduled_date: "2026-08-18" });
    expect(badServiceClient.error).toBeTruthy();

    const badServicePool = await admin!.from("services").insert({ workspace_id: A.workspaceId, client_id: A.clientId, pool_id: B.poolId, scheduled_date: "2026-08-18" });
    expect(badServicePool.error).toBeTruthy();

    const badAssignee = await admin!.from("services").insert({ workspace_id: A.workspaceId, client_id: A.clientId, assigned_membership_id: B.membershipId, scheduled_date: "2026-08-18" });
    expect(badAssignee.error).toBeTruthy();

    const badTask = await admin!.from("service_tasks").insert({ workspace_id: A.workspaceId, service_id: B.serviceId, label: "Intrus" });
    expect(badTask.error).toBeTruthy();
  });

  it("les interactions de notes restent isolées et l'auteur est dérivé du compte connecté", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });

    const [reads, executions, comments] = await Promise.all([
      asA.from("team_note_reads").select("id").eq("workspace_id", B.workspaceId),
      asA.from("team_note_executions").select("id").eq("workspace_id", B.workspaceId),
      asA.from("team_note_comments").select("id").eq("workspace_id", B.workspaceId),
    ]);
    expect(reads.data ?? []).toHaveLength(0);
    expect(executions.data ?? []).toHaveLength(0);
    expect(comments.data ?? []).toHaveLength(0);

    const ownComment = await asA.from("team_note_comments")
      .insert({ workspace_id: A.workspaceId, team_note_id: A.noteId, author_membership_id: A.membershipId, content: "Commentaire de A" })
      .select("author_label")
      .single();
    expect(ownComment.error).toBeNull();
    expect(ownComment.data?.author_label).toBe("T TenantA");

    const intrusion = await asA.from("team_note_executions")
      .insert({ workspace_id: B.workspaceId, team_note_id: B.noteId, membership_id: B.membershipId })
      .select("id");
    expect(!intrusion.data || intrusion.data.length === 0 || !!intrusion.error).toBe(true);
  });
});
