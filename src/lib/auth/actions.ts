"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

// ---------------------------------------------------------------------------
// Résolution du code entreprise (étape 1 de la connexion).
// Le code n'est pas un secret : il sert à identifier le workspace à rejoindre.
// ---------------------------------------------------------------------------
export async function resolveCompanyCode(code: string): Promise<ActionResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return fail("Veuillez saisir votre code entreprise.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, name, status")
    .eq("company_code", normalized)
    .maybeSingle();

  if (error) return fail("Erreur lors de la vérification du code.");
  if (!data) return fail("Code entreprise introuvable.");
  if (data.status !== "active") return fail("Cet espace est actuellement désactivé.");

  return ok(undefined, { workspaceId: data.id, name: data.name, code: normalized });
}

// ---------------------------------------------------------------------------
// Connexion (gérant ou membre) rattachée à un workspace précis.
// ---------------------------------------------------------------------------
const signInSchema = z.object({
  workspaceId: z.string().uuid(),
  expectedRole: z.enum(["admin", "member"]),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    expectedRole: formData.get("expectedRole"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const { workspaceId, expectedRole, email, password } = parsed.data;

  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !auth.user) {
    return fail("Identifiants incorrects.");
  }

  // Vérifie l'appartenance au workspace correspondant au code + le statut.
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("id, role, status, workspace_id")
    .eq("user_id", auth.user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    return fail("Ce compte n'appartient pas à cet espace.");
  }
  if (membership.status !== "active") {
    await supabase.auth.signOut();
    return fail("Ce compte est désactivé. Contactez votre administrateur.");
  }
  if (expectedRole === "admin" && membership.role !== "admin") {
    await supabase.auth.signOut();
    return fail("Ce compte n'est pas un compte gérant. Choisissez « Membre de l'équipe ».");
  }

  // Journalise la connexion.
  await admin.from("activity_logs").insert({
    workspace_id: workspaceId,
    actor_membership_id: membership.id,
    action: "login",
    entity_type: "auth",
    summary: "Connexion",
  });

  redirect("/app");
}

// ---------------------------------------------------------------------------
// Création d'un espace (workspace + admin principal).
// ---------------------------------------------------------------------------
const signUpSchema = z.object({
  companyName: z.string().min(2, "Nom de l'entreprise requis."),
  siret: z.string().optional(),
  address_line1: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal("")),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    companyName: formData.get("companyName"),
    siret: formData.get("siret") || undefined,
    address_line1: formData.get("address_line1") || undefined,
    postal_code: formData.get("postal_code") || undefined,
    city: formData.get("city") || undefined,
    phone: formData.get("phone") || undefined,
    companyEmail: formData.get("companyEmail") || "",
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const v = parsed.data;
  const admin = createAdminClient();

  // 1. Crée l'utilisateur Auth (mot de passe haché par Supabase, jamais en clair).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { first_name: v.firstName, last_name: v.lastName },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase().includes("already")
      ? "Un compte existe déjà avec cette adresse e-mail."
      : "Impossible de créer le compte. Réessayez.";
    return fail(msg);
  }

  // 2. Provisionne le workspace + membership admin + toutes les permissions (transactionnel).
  const { data: prov, error: provErr } = await admin.rpc("provision_workspace", {
    p_user_id: created.user.id,
    p_company_name: v.companyName,
    p_admin_first: v.firstName,
    p_admin_last: v.lastName,
    p_admin_email: v.email,
    p_company: {
      address_line1: v.address_line1,
      postal_code: v.postal_code,
      city: v.city,
      phone: v.phone,
      email: v.companyEmail || null,
      siret: v.siret,
    },
    p_code_prefix: v.companyName.slice(0, 3),
  });

  if (provErr || !prov || (Array.isArray(prov) && prov.length === 0)) {
    // Compensation : supprime l'utilisateur si le provisioning échoue.
    await admin.auth.admin.deleteUser(created.user.id);
    return fail("Erreur lors de la création de l'espace. Réessayez.");
  }

  const row = Array.isArray(prov) ? prov[0] : prov;

  // 3. Établit la session (connexion automatique).
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: v.email,
    password: v.password,
  });
  if (signInErr) {
    // Le compte est créé ; on redirige vers la connexion.
    redirect("/login");
  }

  return ok("Espace créé.", { companyCode: row.company_code });
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
