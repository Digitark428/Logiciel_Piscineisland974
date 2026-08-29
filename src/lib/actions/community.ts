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
  type CommunityFeedItem,
  type CommunityPendingUpload,
  type CommunityReactionKind,
  type CommunityUploadRequest,
  type CommunityUploadTicket,
} from "@/lib/community-types";
import {
  COMMUNITY_MAX_IMAGES,
  COMMUNITY_MAX_SOURCE_BYTES,
  detectCommunityImageFormat,
  normalizeCommunityImage,
  type CommunityImageFormat,
} from "@/lib/community-media";

const postIdSchema = z.string().uuid();
const commentSchema = z.string().trim().min(1, "Le commentaire est vide.").max(4000, "Commentaire trop long.");
const contentSchema = z.string().trim().max(2000, "Statut trop long.");
const cursorSchema = z.object({
  createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Curseur invalide."),
  id: z.string().uuid(),
});
const uploadRequestSchema = z.array(z.object({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(COMMUNITY_MAX_SOURCE_BYTES),
  type: z.string().max(120),
})).min(1).max(COMMUNITY_MAX_IMAGES);
const pendingUploadSchema = z.array(z.object({
  path: z.string().min(1).max(500),
  originalName: z.string().trim().min(1).max(255),
})).max(COMMUNITY_MAX_IMAGES);

export type CommunityUploadSessionResult = ActionResult & { uploads?: CommunityUploadTicket[] };
export type CreateCommunityPostResult = ActionResult & { post?: CommunityFeedItem; skippedCount?: number };

function isScopedTemporaryPath(path: string, workspaceId: string, membershipId: string): boolean {
  const prefix = `${workspaceId}/temp/${membershipId}/`;
  if (!path.startsWith(prefix)) return false;
  const suffix = path.slice(prefix.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-3]-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suffix);
}

function originalImageContentType(format: CommunityImageFormat): string {
  const types: Record<CommunityImageFormat, string> = {
    avif: "image/avif",
    gif: "image/gif",
    heic: "image/heic",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return types[format];
}

/** Prépare des URLs à usage court : les fichiers lourds vont directement vers Storage. */
export async function createCommunityUploadSession(rawFiles: CommunityUploadRequest[]): Promise<CommunityUploadSessionResult> {
  try {
    const res = await actionContext();
    if ("error" in res) return res.error;
    const { ctx } = res;
    if (!can(ctx, "community.publish")) return fail("Vous n'êtes pas autorisé à publier dans Entre nous.");
    const parsed = uploadRequestSchema.safeParse(rawFiles);
    if (!parsed.success) return fail(`Ajoutez entre 1 et ${COMMUNITY_MAX_IMAGES} photos de moins de 35 Mo.`);

    const admin = createAdminClient();
    const sessionId = crypto.randomUUID();
    const uploads: CommunityUploadTicket[] = [];
    for (const [index] of parsed.data.entries()) {
      const path = `${ctx.workspace.id}/temp/${ctx.membership.id}/${sessionId}/${index}-${crypto.randomUUID()}`;
      const { data, error } = await admin.storage.from("community-media").createSignedUploadUrl(path);
      if (error || !data?.token) return fail("Impossible de préparer l'envoi des photos.");
      uploads.push({ path, token: data.token });
    }
    return { ...ok(), uploads };
  } catch (error) {
    console.error("[community.upload-session] failed", error instanceof Error ? error.message : String(error));
    return fail("Impossible de préparer l'envoi des photos.");
  }
}

/** Crée un statut après validation et normalisation serveur de chaque photo. */
export async function createCommunityPost(input: { content: string; uploads: CommunityPendingUpload[] }): Promise<CreateCommunityPostResult> {
  try {
    return await createCommunityPostImpl(input);
  } catch (error) {
    // Un retour ActionResult évite une erreur cliente opaque si Storage ou le runtime échoue.
    console.error("[community.create] publication failed", error instanceof Error ? error.message : String(error));
    return fail("Impossible de publier pour le moment. Réessayez dans quelques instants.");
  }
}

async function createCommunityPostImpl(input: { content: string; uploads: CommunityPendingUpload[] }): Promise<CreateCommunityPostResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  if (!can(ctx, "community.publish")) return fail("Vous n'êtes pas autorisé à publier dans Entre nous.");

  const parsed = contentSchema.safeParse(input.content ?? "");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Statut invalide.");
  const content = parsed.data || null;
  const uploads = pendingUploadSchema.safeParse(input.uploads);
  if (!uploads.success) return fail("La sélection de photos est invalide.");
  if (!content && uploads.data.length === 0) return fail("Ajoutez un statut ou au moins une photo.");
  if (uploads.data.some((item) => !isScopedTemporaryPath(item.path, ctx.workspace.id, ctx.membership.id))) {
    return fail("La sélection de photos a expiré. Sélectionnez-les à nouveau.");
  }
  if (new Set(uploads.data.map((item) => item.path)).size !== uploads.data.length) return fail("La sélection contient un doublon.");

  const admin = createAdminClient();
  const temporaryPaths = uploads.data.map((item) => item.path);
  const prepared: Array<{
    buffer: Buffer;
    contentType: "image/webp";
    originalBuffer: Buffer;
    originalFormat: CommunityImageFormat;
    originalName: string;
  }> = [];
  let skippedCount = 0;
  try {
    for (const [index, item] of uploads.data.entries()) {
      try {
        const { data, error } = await admin.storage.from("community-media").download(item.path);
        if (error || !data) throw new Error("download-failed");
        const source = Buffer.from(await data.arrayBuffer());
        const originalFormat = detectCommunityImageFormat(source);
        if (!originalFormat) throw new Error("unsupported-image-format");
        const normalized = await normalizeCommunityImage(source);
        prepared.push({
          buffer: normalized.buffer,
          contentType: normalized.contentType,
          originalBuffer: source,
          originalFormat,
          originalName: item.originalName,
        });
      } catch (error) {
        console.warn("[community.media] skipped", index, error instanceof Error ? error.message : String(error));
        skippedCount += 1;
      }
    }
  } finally {
    if (temporaryPaths.length > 0) await admin.storage.from("community-media").remove(temporaryPaths);
  }
  if (!content && prepared.length === 0) return fail("Impossible de traiter cette photo. Essayez une autre image.");

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
      const path = `${ctx.workspace.id}/posts/${postId}/${position}-${crypto.randomUUID()}.webp`;
      const originalPath = `${ctx.workspace.id}/posts/${postId}/original-${position}-${crypto.randomUUID()}.${item.originalFormat}`;
      const { error: originalUploadError } = await admin.storage
        .from("community-media")
        .upload(originalPath, item.originalBuffer, {
          contentType: originalImageContentType(item.originalFormat),
          cacheControl: "31536000",
          upsert: false,
        });
      if (originalUploadError) throw new Error("original-upload");
      uploadedPaths.push(originalPath);

      const { error: uploadError } = await admin.storage
        .from("community-media")
        .upload(path, item.buffer, { contentType: item.contentType, cacheControl: "31536000", upsert: false });
      if (uploadError) throw new Error("upload");
      uploadedPaths.push(path);

      const { error: mediaError } = await admin.from("community_post_media").insert({
        workspace_id: ctx.workspace.id,
        post_id: postId,
        storage_path: path,
        original_storage_path: originalPath,
        original_name: item.originalName,
        original_mime_type: originalImageContentType(item.originalFormat),
        original_size_bytes: item.originalBuffer.byteLength,
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
  let post: CommunityFeedItem | undefined;
  try {
    const latest = await getCommunityFeedPage(ctx, 5);
    post = latest.items.find((item) => item.id === postId);
  } catch {
    // La publication existe déjà : un échec de rafraîchissement ne doit pas la signaler comme perdue.
  }
  const message = skippedCount > 0
    ? `Publication ajoutée. ${skippedCount} photo${skippedCount > 1 ? "s n'ont" : " n'a"} pas pu être traitée.`
    : "Publication ajoutée.";
  return { ...ok(message), post, skippedCount };
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
    .select("storage_path, original_storage_path")
    .eq("post_id", id)
    .eq("workspace_id", ctx.workspace.id);
  const { error } = await admin
    .from("community_posts")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");

  const paths = (media ?? [])
    .flatMap((item) => [item.storage_path, item.original_storage_path])
    .filter((path): path is string => Boolean(path));
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

  const supabase = await createClient();
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

  const supabase = await createClient();
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
