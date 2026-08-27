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
const A = { email: `iso-a-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "", membershipId: "", poolId: "", serviceId: "", cancelledServiceId: "", seriesId: "", weeklySeriesId: "", recurringServiceId: "", financialId: "", documentId: "", employeeEmail: `iso-member-${rnd}@example.test`, employeeUserId: "", employeeMembershipId: "", noteId: "", communityPostId: "" };
const B = { email: `iso-b-${rnd}@example.test`, password: "Password123!", userId: "", workspaceId: "", clientId: "", membershipId: "", poolId: "", serviceId: "", cancelledServiceId: "", seriesId: "", weeklySeriesId: "", recurringServiceId: "", financialId: "", documentId: "", employeeEmail: "", employeeUserId: "", employeeMembershipId: "", noteId: "", communityPostId: "" };

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
  const { data: document } = await admin!.from("documents")
    .insert({ workspace_id: t.workspaceId, entity_type: "client", entity_id: t.clientId, category: "contract", name: "Contrat", storage_path: `${t.workspaceId}/contract.pdf` })
    .select("id")
    .single();
  t.documentId = document!.id;
  const { data: service } = await admin!.from("services").insert({ workspace_id: t.workspaceId, client_id: t.clientId, pool_id: t.poolId, assigned_membership_id: t.membershipId, scheduled_date: "2026-08-17" }).select("id").single();
  t.serviceId = service!.id;
  const { data: financial } = await admin!.from("service_financials")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, financial_kind: "one_off", service_id: t.serviceId, amount_cents: 85000 })
    .select("id")
    .single();
  t.financialId = financial!.id;
  const { data: cancelledService } = await admin!.from("services")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, pool_id: t.poolId, assigned_membership_id: t.membershipId, scheduled_date: "2026-08-20", status: "cancelled" })
    .select("id")
    .single();
  t.cancelledServiceId = cancelledService!.id;
  await admin!.from("service_financials")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, financial_kind: "one_off", service_id: t.cancelledServiceId, amount_cents: 18000 });
  const { data: series } = await admin!.from("service_series")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, pool_id: t.poolId, service_type: "Entretien", mode: "frequency", frequency: "weekly" })
    .select("id")
    .single();
  t.seriesId = series!.id;
  const { data: recurringServices } = await admin!.from("services").insert([5, 12, 19, 26].map((day) => ({
    workspace_id: t.workspaceId,
    client_id: t.clientId,
    pool_id: t.poolId,
    assigned_membership_id: t.membershipId,
    series_id: t.seriesId,
    kind: "recurring",
    occurrence_date: `2026-08-${day}`,
    scheduled_date: `2026-08-${day}`,
  }))).select("id");
  t.recurringServiceId = recurringServices![0].id;
  await admin!.from("service_financials")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, financial_kind: "monthly_contract", service_series_id: t.seriesId, amount_cents: 20000 });
  const { data: weeklySeries } = await admin!.from("service_series")
    .insert({
      workspace_id: t.workspaceId,
      client_id: t.clientId,
      service_type: "pool_maintenance",
      mode: "frequency",
      frequency: "weekly",
      recurrence_kind: "weekly_contract",
      recurrence_weekday: 1,
      starts_on: "2026-08-03",
      assigned_membership_id: t.membershipId,
      status: "active",
    })
    .select("id")
    .single();
  t.weeklySeriesId = weeklySeries!.id;
  await admin!.from("service_financials")
    .insert({ workspace_id: t.workspaceId, client_id: t.clientId, financial_kind: "monthly_contract", service_series_id: t.weeklySeriesId, amount_cents: 30000 });
  const { data: note } = await admin!.from("team_notes")
    .insert({ workspace_id: t.workspaceId, author_membership_id: t.membershipId, content: `Note privée ${name}` })
    .select("id")
    .single();
  t.noteId = note!.id;
  await admin!.from("team_note_reads").insert({ workspace_id: t.workspaceId, team_note_id: t.noteId, membership_id: t.membershipId });
  await admin!.from("team_note_executions").insert({ workspace_id: t.workspaceId, team_note_id: t.noteId, membership_id: t.membershipId });
  await admin!.from("team_note_comments").insert({ workspace_id: t.workspaceId, team_note_id: t.noteId, author_membership_id: t.membershipId, content: `Commentaire privé ${name}` });
  const { data: communityPost } = await admin!.from("community_posts")
    .insert({ workspace_id: t.workspaceId, author_membership_id: t.membershipId, content: `Publication privée ${name}` })
    .select("id")
    .single();
  t.communityPostId = communityPost!.id;
  await admin!.from("community_post_media").insert({
    workspace_id: t.workspaceId,
    post_id: t.communityPostId,
    storage_path: `${t.workspaceId}/posts/${t.communityPostId}/0.webp`,
    position: 0,
  });
}

describe.skipIf(!READY)("Isolation multi-tenant (RLS)", () => {
  beforeAll(async () => {
    await setupTenant(A, "TenantA");
    await setupTenant(B, "TenantB");
    const { data: employee } = await admin!.auth.admin.createUser({ email: A.employeeEmail, password: A.password, email_confirm: true });
    A.employeeUserId = employee!.user!.id;
    const { data: membershipId } = await admin!.rpc("provision_member", {
      p_workspace_id: A.workspaceId,
      p_user_id: A.employeeUserId,
      p_first: "Employé",
      p_last: "TenantA",
      p_email: A.employeeEmail,
      p_permission_keys: ["clients.view", "services.view", "services.complete", "tasks.view", "planning.view"],
    });
    A.employeeMembershipId = membershipId!;
    await admin!.from("services").update({ assigned_membership_id: A.employeeMembershipId }).eq("id", A.recurringServiceId);
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from("workspaces").delete().eq("id", A.workspaceId);
    await admin.from("workspaces").delete().eq("id", B.workspaceId);
    await admin.auth.admin.deleteUser(A.userId).catch(() => {});
    await admin.auth.admin.deleteUser(B.userId).catch(() => {});
    await admin.auth.admin.deleteUser(A.employeeUserId).catch(() => {});
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

    const badAssignedTask = await admin!.from("tasks").insert({
      workspace_id: A.workspaceId,
      created_by: A.membershipId,
      assigned_membership_id: B.membershipId,
      category: "professional",
      title: "Intrusion inter-workspace",
    });
    expect(badAssignedTask.error).toBeTruthy();

    const badSeriesDocument = await admin!.from("service_series").update({ contract_document_id: B.documentId }).eq("id", A.weeklySeriesId);
    expect(badSeriesDocument.error).toBeTruthy();

    const rewrittenOccurrence = await admin!.from("services").update({ occurrence_date: "2026-09-30" }).eq("id", A.recurringServiceId);
    expect(rewrittenOccurrence.error).toBeTruthy();

    const badFinancial = await admin!.from("service_financials")
      .insert({ workspace_id: A.workspaceId, client_id: A.clientId, financial_kind: "one_off", service_id: B.serviceId, amount_cents: 1 });
    expect(badFinancial.error).toBeTruthy();

    const badRecurringFinancial = await admin!.from("service_financials")
      .insert({ workspace_id: A.workspaceId, client_id: A.clientId, financial_kind: "one_off", service_id: A.recurringServiceId, amount_cents: 1 });
    expect(badRecurringFinancial.error).toBeTruthy();
  });

  it("l'admin peut gérer ses montants et le calcul évite les doublons de récurrence", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });

    const read = await asA.from("service_financials").select("amount_cents").eq("id", A.financialId).single();
    expect(read.error).toBeNull();
    expect(read.data?.amount_cents).toBe(85000);

    const update = await asA.from("service_financials").update({ amount_cents: 90000 }).eq("id", A.financialId).select("amount_cents").single();
    expect(update.error).toBeNull();
    expect(update.data?.amount_cents).toBe(90000);

    const metrics = await asA.rpc("financial_dashboard_metrics", { p_workspace_id: A.workspaceId, p_month: "2026-08-01" }).single();
    expect(metrics.error).toBeNull();
    const metricValues = metrics.data as { recurring_cents: number; one_off_cents: number } | null;
    // Les quatre passages historiques ne comptent qu'une fois (200 €), et le
    // contrat hebdomadaire paresseux compte aussi sans occurrence créée (300 €).
    expect(metricValues?.recurring_cents).toBe(50000);
    // La prestation annulée à 180 € est exclue.
    expect(metricValues?.one_off_cents).toBe(90000);
  });

  it("un employé ne peut ni lire ni modifier les montants, même via client ou prestation", async () => {
    const asEmployee = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asEmployee.auth.signInWithPassword({ email: A.employeeEmail, password: A.password });

    const direct = await asEmployee.from("service_financials").select("*").eq("workspace_id", A.workspaceId);
    expect(direct.data ?? []).toHaveLength(0);

    const write = await asEmployee.from("service_financials")
      .insert({ workspace_id: A.workspaceId, client_id: A.clientId, financial_kind: "one_off", service_id: A.serviceId, amount_cents: 1 });
    expect(write.error).toBeTruthy();

    const [service, client, metrics] = await Promise.all([
      asEmployee.from("services").select("id, service_financials(amount_cents)").eq("id", A.serviceId).maybeSingle(),
      asEmployee.from("clients").select("id, service_financials(amount_cents)").eq("id", A.clientId).maybeSingle(),
      asEmployee.rpc("financial_dashboard_metrics", { p_workspace_id: A.workspaceId, p_month: "2026-08-01" }),
    ]);
    expect((service.data as any)?.service_financials ?? []).toHaveLength(0);
    expect((client.data as any)?.service_financials ?? []).toHaveLength(0);
    expect(metrics.data ?? []).toHaveLength(0);
  });

  it("un technicien assigné peut commenter son passage sans modifier le planning", async () => {
    const asEmployee = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asEmployee.auth.signInWithPassword({ email: A.employeeEmail, password: A.password });

    const comment = await asEmployee.from("services")
      .update({ notes: "Commentaire du passage" })
      .eq("id", A.recurringServiceId)
      .select("notes")
      .single();
    expect(comment.error).toBeNull();
    expect(comment.data?.notes).toBe("Commentaire du passage");

    const planning = await asEmployee.from("services")
      .update({ scheduled_date: "2026-09-01" })
      .eq("id", A.recurringServiceId)
      .select("scheduled_date");
    expect(planning.error).toBeTruthy();
  });

  it("un admin ne peut pas lire les données financières d'un autre workspace", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });

    const [financials, metrics] = await Promise.all([
      asA.from("service_financials").select("id").eq("workspace_id", B.workspaceId),
      asA.rpc("financial_dashboard_metrics", { p_workspace_id: B.workspaceId, p_month: "2026-08-01" }),
    ]);
    expect(financials.data ?? []).toHaveLength(0);
    expect(metrics.data ?? []).toHaveLength(0);
  });

  it("préserve la confidentialité des to-do personnelles et leurs priorités", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const asEmployee = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await Promise.all([
      asA.auth.signInWithPassword({ email: A.email, password: A.password }),
      asEmployee.auth.signInWithPassword({ email: A.employeeEmail, password: A.password }),
    ]);

    const employeeTask = await asEmployee.from("tasks").insert({
      workspace_id: A.workspaceId,
      created_by: A.employeeMembershipId,
      category: "personal",
      title: "To-do strictement privée",
      priority: "very_urgent",
      due_date: "2026-08-25",
      due_time: "07:30",
    }).select("id,priority,due_time").single();
    expect(employeeTask.error).toBeNull();
    expect(employeeTask.data?.priority).toBe("very_urgent");
    expect(employeeTask.data?.due_time).toBe("07:30:00");

    const ownPriorityUpdate = await asEmployee.from("tasks")
      .update({ priority: "not_urgent" })
      .eq("id", employeeTask.data!.id)
      .select("priority")
      .single();
    expect(ownPriorityUpdate.error).toBeNull();
    expect(ownPriorityUpdate.data?.priority).toBe("not_urgent");

    const adminRead = await asA.from("tasks").select("id").eq("id", employeeTask.data!.id);
    expect(adminRead.data ?? []).toHaveLength(0);

    const adminPriorityUpdate = await asA.from("tasks")
      .update({ priority: "urgent" })
      .eq("id", employeeTask.data!.id)
      .select("id");
    expect(adminPriorityUpdate.data ?? []).toHaveLength(0);

    const invalidPriority = await asEmployee.from("tasks").insert({
      workspace_id: A.workspaceId,
      created_by: A.employeeMembershipId,
      category: "personal",
      title: "Priorité invalide",
      priority: "un jour peut-être",
    });
    expect(invalidPriority.error).toBeTruthy();
  });

  it("isole les événements personnels par membership et workspace", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const asEmployee = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await Promise.all([
      asA.auth.signInWithPassword({ email: A.email, password: A.password }),
      asEmployee.auth.signInWithPassword({ email: A.employeeEmail, password: A.password }),
    ]);

    const employeeEvent = await asEmployee.from("planning_events").insert({
      workspace_id: A.workspaceId,
      owner_membership_id: A.employeeMembershipId,
      title: "Rendez-vous personnel employé",
      event_date: "2026-08-25",
      start_time: "08:00",
      end_time: "09:00",
    }).select("id,title").single();
    expect(employeeEvent.error).toBeNull();

    const [employeeRead, adminRead, otherWorkspaceRead] = await Promise.all([
      asEmployee.from("planning_events").select("id").eq("id", employeeEvent.data!.id),
      asA.from("planning_events").select("id").eq("id", employeeEvent.data!.id),
      asEmployee.from("planning_events").select("id").eq("workspace_id", B.workspaceId),
    ]);
    expect(employeeRead.data).toHaveLength(1);
    expect(adminRead.data ?? []).toHaveLength(0);
    expect(otherWorkspaceRead.data ?? []).toHaveLength(0);

    const reassign = await asEmployee.from("planning_events")
      .update({ owner_membership_id: A.membershipId })
      .eq("id", employeeEvent.data!.id)
      .select("id");
    expect(reassign.error).toBeTruthy();

    const crossTenantGuard = await admin!.from("planning_events").insert({
      workspace_id: A.workspaceId,
      owner_membership_id: B.membershipId,
      title: "Intrusion inter-espace",
      event_date: "2026-08-25",
      all_day: true,
    });
    expect(crossTenantGuard.error).toBeTruthy();
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

    const { data: interactionNote } = await admin!.from("team_notes")
      .insert({ workspace_id: A.workspaceId, author_membership_id: A.membershipId, content: "Note à traiter" })
      .select("id")
      .single();
    expect(interactionNote?.id).toBeTruthy();

    const ownRead = await asA.from("team_note_reads")
      .insert({ workspace_id: A.workspaceId, team_note_id: interactionNote!.id, membership_id: A.membershipId })
      .select("reader_label")
      .single();
    expect(ownRead.error).toBeNull();
    expect(ownRead.data?.reader_label).toBe("T TenantA");

    const ownExecution = await asA.from("team_note_executions")
      .insert({ workspace_id: A.workspaceId, team_note_id: interactionNote!.id, membership_id: A.membershipId })
      .select("executor_label")
      .single();
    expect(ownExecution.error).toBeNull();
    expect(ownExecution.data?.executor_label).toBe("T TenantA");

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

  it("Entre nous isole les publications, réactions et commentaires par workspace", async () => {
    const asA = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await asA.auth.signInWithPassword({ email: A.email, password: A.password });

    const hidden = await asA.from("community_posts").select("id").eq("workspace_id", B.workspaceId);
    expect(hidden.data ?? []).toHaveLength(0);

    const search = await asA.from("community_posts").select("id,content").eq("workspace_id", A.workspaceId).ilike("content", "%TenantA%");
    expect(search.error).toBeNull();
    expect(search.data?.map((post) => post.id)).toContain(A.communityPostId);
    expect(search.data?.map((post) => post.id)).not.toContain(B.communityPostId);

    const gallery = await asA.from("community_post_media").select("post_id").eq("workspace_id", A.workspaceId);
    expect(gallery.error).toBeNull();
    expect(gallery.data?.map((media) => media.post_id)).toContain(A.communityPostId);
    expect(gallery.data?.map((media) => media.post_id)).not.toContain(B.communityPostId);

    const directIntrusion = await asA.from("community_post_comments")
      .insert({ workspace_id: B.workspaceId, post_id: B.communityPostId, author_membership_id: B.membershipId, content: "Intrusion" });
    expect(directIntrusion.error).toBeTruthy();

    const badPost = await admin!.from("community_posts")
      .insert({ workspace_id: A.workspaceId, author_membership_id: B.membershipId, content: "Intrusion serveur" });
    expect(badPost.error).toBeTruthy();

    const badReaction = await admin!.from("community_post_reactions")
      .insert({ workspace_id: A.workspaceId, post_id: B.communityPostId, membership_id: A.membershipId, reaction: "like" });
    expect(badReaction.error).toBeTruthy();

    const badMedia = await admin!.from("community_post_media")
      .insert({ workspace_id: A.workspaceId, post_id: B.communityPostId, storage_path: `${A.workspaceId}/posts/intrusion/0.webp`, position: 0 });
    expect(badMedia.error).toBeTruthy();

    const badComment = await admin!.from("community_post_comments")
      .insert({ workspace_id: A.workspaceId, post_id: B.communityPostId, author_membership_id: A.membershipId, content: "Intrusion serveur" });
    expect(badComment.error).toBeTruthy();
  });
});
