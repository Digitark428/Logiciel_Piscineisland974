"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionContext, logActivity, notify } from "@/lib/actions/helpers";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const str = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

function validAvatarBuffer(type: string, buffer: Buffer): boolean {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return type === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

/** Charge un membre du workspace courant (via admin) en validant l'appartenance. */
async function loadMember(workspaceId: string, membershipId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("*")
    .eq("id", membershipId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data;
}

const createSchema = z.object({
  first_name: z.string().min(1, "Prénom requis."),
  last_name: z.string().min(1, "Nom requis."),
  email: z.string().email("E-mail invalide."),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum."),
  member_type: z.enum(["employe", "prestataire", "stagiaire", "alternant"]),
  role: z.enum(["admin", "member"]),
});

export async function createMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");

  const parsed = createSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    member_type: formData.get("member_type") ?? "employe",
    role: formData.get("role") ?? "member",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  const v = parsed.data;

  const permKeys = formData.getAll("perm").map(String).filter((k) => PERMISSION_KEYS.includes(k as any));
  const admin = createAdminClient();

  // 1. Crée l'utilisateur Auth (mot de passe haché par Supabase).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { first_name: v.first_name, last_name: v.last_name },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase().includes("already")
      ? "Un compte existe déjà avec cette adresse e-mail."
      : "Impossible de créer le compte.";
    return fail(msg);
  }

  // 2. Crée le membership + permissions (RPC transactionnelle).
  const { data: membershipId, error: provErr } = await admin.rpc("provision_member", {
    p_workspace_id: ctx.workspace.id,
    p_user_id: created.user.id,
    p_first: v.first_name,
    p_last: v.last_name,
    p_email: v.email,
    p_member_type: v.member_type,
    p_role: v.role,
    p_permission_keys: v.role === "admin" ? null : permKeys,
  });
  if (provErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return fail("Impossible de créer le membre.");
  }

  await logActivity(ctx, { action: "create", entity_type: "member", entity_id: String(membershipId), summary: `Membre ajouté : ${v.first_name} ${v.last_name}` });
  await notify(ctx.workspace.id, { type: "member_added", title: "Nouveau membre", body: `${v.first_name} ${v.last_name} a rejoint l'équipe.`, entity_type: "member" });

  revalidatePath("/app/team");
  redirect(`/app/team/${membershipId}`);
}

const profileSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  member_type: z.enum(["employe", "prestataire", "stagiaire", "alternant"]),
  role: z.enum(["admin", "member"]),
});

export async function updateMemberProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");

  const parsed = profileSchema.safeParse({
    id: formData.get("id"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    member_type: formData.get("member_type") ?? "employe",
    role: formData.get("role") ?? "member",
  });
  if (!parsed.success) return fail("Formulaire invalide.");
  const v = parsed.data;

  const member = await loadMember(ctx.workspace.id, v.id);
  if (!member) return fail("Membre introuvable.");
  // Empêche l'admin de se retirer à lui-même le rôle admin (éviter de se verrouiller).
  if (member.id === ctx.membership.id && v.role !== "admin") {
    return fail("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("memberships")
    .update({ first_name: v.first_name, last_name: v.last_name, member_type: v.member_type, role: v.role, job_title: str(formData.get("job_title")), phone: str(formData.get("phone")) })
    .eq("id", v.id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Enregistrement impossible.");

  // Si promu admin → toutes les permissions.
  if (v.role === "admin") {
    await admin.rpc("assign_all_permissions", { p_membership_id: v.id, p_workspace_id: ctx.workspace.id });
  }

  await logActivity(ctx, { action: "update", entity_type: "member", entity_id: v.id, summary: `Membre modifié : ${v.first_name} ${v.last_name}` });
  revalidatePath(`/app/team/${v.id}`);
  return ok("Membre enregistré.");
}

export async function updateMemberPermissions(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");
  const id = String(formData.get("id") ?? "");
  const member = await loadMember(ctx.workspace.id, id);
  if (!member) return fail("Membre introuvable.");
  if (member.role === "admin") return fail("Un administrateur possède déjà toutes les permissions.");

  const keys = formData.getAll("perm").map(String).filter((k) => PERMISSION_KEYS.includes(k as any));
  const admin = createAdminClient();
  const { error } = await admin.rpc("set_member_permissions", { p_membership_id: id, p_workspace_id: ctx.workspace.id, p_keys: keys });
  if (error) return fail("Enregistrement impossible.");
  await logActivity(ctx, { action: "permissions_change", entity_type: "member", entity_id: id, summary: "Permissions modifiées" });
  revalidatePath(`/app/team/${id}`);
  return ok("Permissions enregistrées.");
}

export async function updateMemberEmail(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");
  const id = String(formData.get("id") ?? "");
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return fail("E-mail invalide.");

  const member = await loadMember(ctx.workspace.id, id);
  if (!member) return fail("Membre introuvable.");

  const admin = createAdminClient();
  const { error: authErr } = await admin.auth.admin.updateUserById(member.user_id, { email: email.data, email_confirm: true });
  if (authErr) return fail(authErr.message.toLowerCase().includes("already") ? "Cette adresse est déjà utilisée." : "Modification impossible.");
  await admin.from("memberships").update({ email: email.data }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  await logActivity(ctx, { action: "update", entity_type: "member", entity_id: id, summary: "E-mail du membre modifié" });
  revalidatePath(`/app/team/${id}`);
  return ok("E-mail modifié.");
}

export async function resetMemberPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return fail("Mot de passe : 8 caractères minimum.");

  const member = await loadMember(ctx.workspace.id, id);
  if (!member) return fail("Membre introuvable.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(member.user_id, { password });
  if (error) return fail("Modification impossible.");
  await logActivity(ctx, { action: "update", entity_type: "member", entity_id: id, summary: "Mot de passe réinitialisé" });
  return ok("Mot de passe réinitialisé.");
}

export async function setMemberStatus(id: string, disabled: boolean): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!ctx.isAdmin) return fail("Réservé à l'administrateur.");
  if (id === ctx.membership.id) return fail("Vous ne pouvez pas désactiver votre propre compte.");

  const member = await loadMember(ctx.workspace.id, id);
  if (!member) return fail("Membre introuvable.");

  const admin = createAdminClient();
  const { error } = await admin.from("memberships").update({ status: disabled ? "disabled" : "active" }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Action impossible.");
  await logActivity(ctx, { action: "update", entity_type: "member", entity_id: id, summary: disabled ? "Membre désactivé" : "Membre réactivé" });
  revalidatePath("/app/team");
  revalidatePath(`/app/team/${id}`);
  return ok(disabled ? "Membre désactivé." : "Membre réactivé.");
}

/** Upload/remplacement de la photo de profil (self ou admin). */
export async function uploadMemberPhoto(formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const id = String(formData.get("id") ?? "");
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return fail("Aucun fichier.");
  if (file.size > 5 * 1024 * 1024) return fail("Image trop volumineuse (max 5 Mo).");

  const isSelf = id === ctx.membership.id;
  if (!isSelf && !ctx.isAdmin) return fail("Non autorisé.");
  const member = await loadMember(ctx.workspace.id, id);
  if (!member) return fail("Membre introuvable.");

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${ctx.workspace.id}/members/${id}/photo-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validAvatarBuffer(file.type, buffer)) return fail("Image non autorisée ou invalide.");
  const { error: upErr } = await admin.storage.from("avatars").upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: true });
  if (upErr) return fail("Téléversement impossible.");

  // Supprime l'ancienne photo si présente.
  if (member.photo_path) await admin.storage.from("avatars").remove([member.photo_path]);
  await admin.from("memberships").update({ photo_path: path }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  await logActivity(ctx, { action: "update", entity_type: "member", entity_id: id, summary: "Photo de profil mise à jour" });
  revalidatePath(`/app/team/${id}`);
  return ok("Photo mise à jour.");
}

export async function removeMemberPhoto(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const isSelf = id === ctx.membership.id;
  if (!isSelf && !ctx.isAdmin) return fail("Non autorisé.");
  const member = await loadMember(ctx.workspace.id, id);
  if (!member) return fail("Membre introuvable.");
  const admin = createAdminClient();
  if (member.photo_path) await admin.storage.from("avatars").remove([member.photo_path]);
  await admin.from("memberships").update({ photo_path: null }).eq("id", id).eq("workspace_id", ctx.workspace.id);
  revalidatePath(`/app/team/${id}`);
  return ok("Photo supprimée.");
}
