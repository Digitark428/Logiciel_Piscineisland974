"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can } from "@/lib/auth/context";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  COMMUNITY_GALLERY_MORE_POSTS,
  COMMUNITY_MORE_POSTS,
  getCommunityFeedPage,
  getCommunityGalleryPage,
} from "@/lib/community";
import { normalizeCommunitySearch } from "@/lib/community-search";
import {
  COMMUNITY_REACTIONS,
  type CommunityCursor,
  type CommunityReactionKind,
} from "@/lib/community-types";

const postIdSchema = z.string().uuid();
const commentSchema = z.string().trim().min(1, "Le commentaire est vide.").max(4000, "Commentaire trop long.");
const contentSchema = z.string().trim().max(2000, "Statut trop long.");
const cursorSchema = z.object({
  createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Curseur invalide."),
  id: z.string().uuid(),
});

function isValidImage(type: string, buffer: Buffer): boolean {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return type === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function extensionFor(type: string): "png" | "jpg" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/** Ne dépend pas du constructeur global File, absent de certains runtimes Node. */
function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string"
    && typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
    && typeof (value as { size?: unknown }).size === "number";
}

/** Crée un statut et, optionnellement, jusqu'à quatre photos privées optimisées côté navigateur. */
export async function createCommunityPost(formData: FormData): Promise<ActionResult> {
  try {
    return await createCommunityPostImpl(formData);
  } catch (error) {
    // Un retour ActionResult évite une erreur cliente opaque si Storage ou le runtime échoue.
    console.error("[community.create] publication failed", error instanceof Error ? error.message : String(error));
    return fail("Impossible de publier pour le moment. Réessayez dans quelques instants.");
  }
}

async function createCommunityPostImpl(formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!can(ctx, "community.publish")) return fail("Vous n'êtes pas autorisé à publier dans Entre nous.");

  const parsed = contentSchema.safeParse(String(formData.get("content") ?? ""));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Statut invalide.");
  const content = parsed.data || null;
  const files = formData.getAll("images").filter((value): value is File => isUploadedFile(value) && value.size > 0);
  if (!content && files.length === 0) return fail("Ajoutez un statut ou au moins une photo.");
  if (files.length > 4) return fail("Vous pouvez ajouter jusqu'à 4 photos.");

  const prepared: Array<{ file: File; buffer: Buffer }> = [];
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return fail("Utilisez une photo JPEG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024) return fail("Une photo dépasse 5 Mo après optimisation.");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImage(file.type, buffer)) return fail("Une image sélectionnée est invalide.");
    prepared.push({ file, buffer });
  }

  const admin = createAdminClient();
  const postId = crypto.randomUUID();
  const { error: postError } = await admin.from("community_posts").insert({
    id: postId,
    workspace_id: ctx.workspace.id,
    author_membership_id: ctx.membership.id,
    content,
  });
  if (postError) return fail("Impossible de publier pour le moment.");

  const uploadedPaths: string[] = [];
  try {
    for (const [position, item] of prepared.entries()) {
      const path = `${ctx.workspace.id}/posts/${postId}/${position}-${Date.now()}.${extensionFor(item.file.type)}`;
      const { error: uploadError } = await admin.storage
        .from("community-media")
        .upload(path, item.buffer, { contentType: item.file.type, upsert: false });
      if (uploadError) throw new Error("upload");
      uploadedPaths.push(path);

      const { error: mediaError } = await admin.from("community_post_media").insert({
        workspace_id: ctx.workspace.id,
        post_id: postId,
        storage_path: path,
        position,
      });
      if (mediaError) throw new Error("media");
    }
  } catch {
    if (uploadedPaths.length > 0) await admin.storage.from("community-media").remove(uploadedPaths);
    await admin.from("community_posts").delete().eq("id", postId).eq("workspace_id", ctx.workspace.id);
    return fail("Impossible d'enregistrer les photos. La publication n'a pas été créée.");
  }

  await logActivity(ctx, {
    action: "create",
    entity_type: "community_post",
    entity_id: postId,
    summary: "Publication ajoutée dans Entre nous",
  });
  revalidatePath("/app/community");
  revalidatePath("/app/community/gallery");
  return ok("Publication ajoutée.");
}

export async function deleteCommunityPost(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!postIdSchema.safeParse(id).success) return fail("Publication introuvable.");

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("community_posts")
    .select("id, author_membership_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!post) return fail("Publication introuvable.");
  if (!ctx.isAdmin && post.author_membership_id !== ctx.membership.id) return fail("Vous ne pouvez supprimer que vos publications.");

  const { data: media } = await admin
    .from("community_post_media")
    .select("storage_path")
    .eq("post_id", id)
    .eq("workspace_id", ctx.workspace.id);
  const { error } = await admin
    .from("community_posts")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");

  const paths = (media ?? []).map((item) => item.storage_path).filter(Boolean);
  if (paths.length > 0) await admin.storage.from("community-media").remove(paths);
  await logActivity(ctx, { action: "delete", entity_type: "community_post", entity_id: id, summary: "Publication supprimée dans Entre nous" });
  revalidatePath("/app/community");
  revalidatePath("/app/community/gallery");
  return ok("Publication supprimée.");
}

export type CommunityReactionResult = ActionResult & { active?: boolean };

/** Une réaction est unique par membre, publication et type ; le second clic la retire. */
export async function toggleCommunityReaction(id: string, reaction: CommunityReactionKind): Promise<CommunityReactionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!can(ctx, "community.publish")) return fail("Vous n'êtes pas autorisé à interagir.");
  if (!postIdSchema.safeParse(id).success || !COMMUNITY_REACTIONS.includes(reaction)) return fail("Réaction invalide.");

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("id")
    .eq("workspace_id", ctx.workspace.id)
    .eq("post_id", id)
    .eq("membership_id", ctx.membership.id)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("community_post_reactions").delete().eq("id", existing.id).eq("workspace_id", ctx.workspace.id);
    if (error) return fail("Impossible de retirer la réaction.");
    return { ...ok(), active: false };
  }

  const { error } = await supabase.from("community_post_reactions").insert({
    workspace_id: ctx.workspace.id,
    post_id: id,
    membership_id: ctx.membership.id,
    reaction,
  });
  if (error) return fail("Impossible d'ajouter la réaction.");
  return { ...ok(), active: true };
}

export async function createCommunityComment(id: string, rawContent: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!can(ctx, "community.publish")) return fail("Vous n'êtes pas autorisé à commenter.");
  if (!postIdSchema.safeParse(id).success) return fail("Publication introuvable.");
  const parsed = commentSchema.safeParse(rawContent);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Commentaire invalide.");

  const supabase = createClient();
  const { error } = await supabase.from("community_post_comments").insert({
    workspace_id: ctx.workspace.id,
    post_id: id,
    author_membership_id: ctx.membership.id,
    content: parsed.data,
  });
  if (error) return fail("Impossible de publier le commentaire.");
  revalidatePath("/app/community");
  return ok("Commentaire ajouté.");
}

export async function deleteCommunityComment(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!postIdSchema.safeParse(id).success) return fail("Commentaire introuvable.");

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("community_post_comments")
    .select("id, author_membership_id, post_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (!comment) return fail("Commentaire introuvable.");
  if (!ctx.isAdmin && comment.author_membership_id !== ctx.membership.id) return fail("Vous ne pouvez supprimer que vos commentaires.");

  const { error } = await admin
    .from("community_post_comments")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  revalidatePath("/app/community");
  return ok("Commentaire supprimé.");
}

export async function loadMoreCommunityPosts(cursor: CommunityCursor, rawSearch?: string) {
  const res = await actionContext();
  if ("error" in res) return { ok: false as const, message: res.error.message ?? "Session expirée." };
  const { ctx } = res;
  if (!can(ctx, "community.view")) return { ok: false as const, message: "Accès refusé." };
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) return { ok: false as const, message: "Curseur invalide." };

  try {
    const page = await getCommunityFeedPage(ctx, COMMUNITY_MORE_POSTS, parsed.data, normalizeCommunitySearch(rawSearch));
    return { ok: true as const, ...page };
  } catch {
    return { ok: false as const, message: "Impossible de charger davantage de publications." };
  }
}

export async function loadMoreCommunityGallery(cursor: CommunityCursor, rawSearch?: string) {
  const res = await actionContext();
  if ("error" in res) return { ok: false as const, message: res.error.message ?? "Session expirée." };
  const { ctx } = res;
  if (!can(ctx, "community.view")) return { ok: false as const, message: "Accès refusé." };
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) return { ok: false as const, message: "Curseur invalide." };
  try {
    const page = await getCommunityGalleryPage(ctx, COMMUNITY_GALLERY_MORE_POSTS, parsed.data, normalizeCommunitySearch(rawSearch));
    return { ok: true as const, ...page };
  } catch {
    return { ok: false as const, message: "Impossible de charger davantage de photos." };
  }
}
