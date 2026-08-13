// Bootstrap Piscine Island : crée le Super Admin + le workspace de démonstration.
// Prérequis : migrations SQL déjà appliquées (voir README).
// Usage : node scripts/bootstrap.mjs
// Variables d'environnement requises (voir .env.example) :
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   DEMO_MANAGER_EMAIL, DEMO_MANAGER_PASSWORD, DEMO_MEMBER_EMAIL, DEMO_MEMBER_PASSWORD
//   SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD (optionnel)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Charge .env.local / .env si présents (sans dépendance dotenv).
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(email) {
  // Parcourt les utilisateurs (pagination) pour retrouver un compte existant.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(email, password, meta = {}) {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (password) await admin.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user.id;
}

async function main() {
  // ---- Super Admin ----
  if (process.env.SUPERADMIN_EMAIL && process.env.SUPERADMIN_PASSWORD) {
    const saId = await ensureUser(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD, { role: "super_admin" });
    await admin.from("platform_admins").upsert({ user_id: saId, status: "active" }, { onConflict: "user_id" });
    console.log("✅ Super Admin prêt :", process.env.SUPERADMIN_EMAIL);
  } else {
    console.log("ℹ️  SUPERADMIN_EMAIL/PASSWORD non fournis — Super Admin non créé.");
  }

  // ---- Démo ----
  const demoManagerEmail = process.env.DEMO_MANAGER_EMAIL;
  const demoManagerPwd = process.env.DEMO_MANAGER_PASSWORD;
  const demoMemberEmail = process.env.DEMO_MEMBER_EMAIL;
  const demoMemberPwd = process.env.DEMO_MEMBER_PASSWORD;

  if (!demoManagerEmail || !demoManagerPwd || !demoMemberEmail || !demoMemberPwd) {
    console.log("ℹ️  Variables DEMO_* incomplètes — démo non créée.");
    return;
  }

  const managerId = await ensureUser(demoManagerEmail, demoManagerPwd, { first_name: "Démo", last_name: "Gérant" });
  const memberId = await ensureUser(demoMemberEmail, demoMemberPwd, { first_name: "Démo", last_name: "Membre" });

  // Le workspace démo existe-t-il déjà (via son membership admin) ?
  const { data: existingMembership } = await admin
    .from("memberships")
    .select("workspace_id, workspaces!inner(is_demo)")
    .eq("user_id", managerId)
    .maybeSingle();

  let workspaceId = existingMembership?.workspace_id ?? null;

  if (!workspaceId) {
    const { data: prov, error } = await admin.rpc("provision_workspace", {
      p_user_id: managerId,
      p_company_name: "Piscine Island — Démo",
      p_admin_first: "Démo",
      p_admin_last: "Gérant",
      p_admin_email: demoManagerEmail,
      p_company: { city: "Saint-Denis", postal_code: "97400", phone: "0262 00 00 00" },
      p_is_demo: true,
      p_code_prefix: "DEMO",
    });
    if (error) throw new Error("provision_workspace: " + error.message);
    workspaceId = (Array.isArray(prov) ? prov[0] : prov).workspace_id;
    console.log("✅ Workspace démo créé :", workspaceId);
  } else {
    console.log("ℹ️  Workspace démo déjà présent :", workspaceId);
  }

  // Membre démo (idempotent)
  const { data: memberMembership } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", memberId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!memberMembership) {
    const { error } = await admin.rpc("provision_member", {
      p_workspace_id: workspaceId,
      p_user_id: memberId,
      p_first: "Démo",
      p_last: "Membre",
      p_email: demoMemberEmail,
      p_member_type: "employe",
      p_role: "member",
      p_permission_keys: ["clients.view", "pools.view", "services.view", "services.complete", "planning.view", "tasks.view", "documents.view"],
    });
    if (error) throw new Error("provision_member: " + error.message);
    console.log("✅ Membre démo créé.");
  }

  // Données de démonstration
  const { error: seedErr } = await admin.rpc("seed_demo_data", { p_workspace_id: workspaceId });
  if (seedErr) throw new Error("seed_demo_data: " + seedErr.message);
  console.log("✅ Données de démonstration générées.");
  console.log("\n🎉 Bootstrap terminé.");
}

main().catch((e) => {
  console.error("❌ Bootstrap échoué :", e.message);
  process.exit(1);
});
