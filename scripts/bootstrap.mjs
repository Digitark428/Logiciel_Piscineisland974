// Bootstrap Piscine Island : crée / met à jour le compte Super Admin.
// Prérequis : migrations SQL déjà appliquées (voir README).
// Usage : node scripts/bootstrap.mjs
// Variables d'environnement requises (voir .env.example) :
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD

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

  console.log("\n🎉 Bootstrap terminé.");
}

main().catch((e) => {
  console.error("❌ Bootstrap échoué :", e.message);
  process.exit(1);
});
