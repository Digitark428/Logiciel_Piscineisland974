import "server-only";

import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import type { SessionContext } from "@/lib/auth/context";
import {
  COMMUNITY_REACTIONS,
  type CommunityCursor,
  type CommunityFeedItem,
  type CommunityGalleryItem,
  type CommunityMember,
  type CommunityReactionKind,
} from "@/lib/community-types";
import { normalizeCommunitySearch } from "@/lib/community-search";

export const COMMUNITY_INITIAL_POSTS = 5;
export const COMMUNITY_MORE_POSTS = 4;
export const COMMUNITY_GALLERY_INITIAL_POSTS = 12;
export const COMMUNITY_GALLERY_MORE_POSTS = 12;

function emptyReactionCounts(): Record<CommunityReactionKind, number> {
  return { like: 0, love: 0, laugh: 0 };
}

function toMember(value: any): CommunityMember {
  const member = Array.isArray(value) ? value[0] : value;
  return {
    id: String(member?.id ?? ""),
    first_name: member?.first_name ?? null,
    last_name: member?.last_name ?? null,
    email: member?.email ?? null,
    role: member?.role === "admin" ? "admin" : member?.role === "member" ? "member" : null,
    job_title: member?.job_title ?? null,
    photo_path: member?.photo_path ?? null,
  };
}

async function matchingAuthorIds(ctx: SessionContext, search: string): Promise<string[]> {
  if (!search) return [];
  const supabase = createClient();
  const pattern = `*${search}*`;
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("workspace_id", ctx.workspace.id)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},job_title.ilike.${pattern}`)
    .limit(50);
  return (data ?? []).map((row) => row.id);
}

/** Page de feed par curseur : aucune publication historique n'est préchargée. */
export async function getCommunityFeedPage(
  ctx: SessionContext,
  limit: number,
  cursor?: CommunityCursor,
  rawSearch?: string,
): Promise<{ items: CommunityFeedItem[]; hasMore: boolean }> {
  const supabase = createClient();
  const search = normalizeCommunitySearch(rawSearch);
  const authorIds = await matchingAuthorIds(ctx, search);
  let query = supabase
    .from("community_posts")
    .select(
      "id, content, created_at, author_membership_id, " +
        "author:memberships!community_posts_author_membership_id_fkey(id,first_name,last_name,email,role,job_title,photo_path), " +
        "media:community_post_media(id,storage_path,position), " +
        "reactions:community_post_reactions(reaction,membership_id), " +
        "comments:community_post_comments(count)",
    )
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (search) {
    query = authorIds.length > 0
      ? query.or(`content.ilike.*${search}*,author_membership_id.in.(${authorIds.join(",")})`)
      : query.ilike("content", `%${search}%`);
  }

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les publications.");

  const rows = (data ?? []).slice(0, limit) as any[];
  const hasMore = (data ?? []).length > limit;
  const members = rows.map((row) => toMember(row.author));
  const avatarPaths = members.map((member) => member.photo_path);
  const mediaPaths = rows.flatMap((row) => (row.media ?? []).map((media: any) => media.storage_path as string));
  const [avatarByPath, mediaByPath] = await Promise.all([
    signedUrls("avatars", avatarPaths),
    signedUrls("community-media", mediaPaths),
  ]);

  const items = rows.map((row, index): CommunityFeedItem => {
    const author = members[index];
    const reactionCounts = emptyReactionCounts();
    const currentReactions: CommunityReactionKind[] = [];
    for (const item of row.reactions ?? []) {
      if (!COMMUNITY_REACTIONS.includes(item.reaction)) continue;
      const reaction = item.reaction as CommunityReactionKind;
      reactionCounts[reaction] += 1;
      if (item.membership_id === ctx.membership.id) currentReactions.push(reaction);
    }

    return {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      authorMembershipId: row.author_membership_id,
      author,
      authorAvatarUrl: author.photo_path ? avatarByPath.get(author.photo_path) ?? null : null,
      media: [...(row.media ?? [])]
        .sort((a: any, b: any) => a.position - b.position)
        .map((media: any) => ({
          id: media.id,
          url: mediaByPath.get(media.storage_path) ?? null,
          position: media.position,
        })),
      reactionCounts,
      currentReactions,
      commentCount: Number(row.comments?.[0]?.count ?? 0),
      canDelete: ctx.isAdmin || row.author_membership_id === ctx.membership.id,
    };
  });

  return { items, hasMore };
}

/** Les médias restent rattachés à leur publication ; seule leur URL privée est régénérée par lot. */
export async function getCommunityGalleryPage(
  ctx: SessionContext,
  limit: number,
  cursor?: CommunityCursor,
  rawSearch?: string,
): Promise<{ items: CommunityGalleryItem[]; hasMore: boolean; nextCursor: CommunityCursor | null }> {
  const supabase = createClient();
  const search = normalizeCommunitySearch(rawSearch);
  const authorIds = await matchingAuthorIds(ctx, search);
  let query = supabase
    .from("community_posts")
    .select(
      "id,content,created_at,author_membership_id," +
        "author:memberships!community_posts_author_membership_id_fkey(id,first_name,last_name,email,role,job_title,photo_path)," +
        "media:community_post_media!inner(id,storage_path,position)",
    )
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (search) {
    query = authorIds.length > 0
      ? query.or(`content.ilike.*${search}*,author_membership_id.in.(${authorIds.join(",")})`)
      : query.ilike("content", `%${search}%`);
  }
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger la galerie.");
  const rows = (data ?? []).slice(0, limit) as any[];
  const hasMore = (data ?? []).length > limit;
  const members = rows.map((row) => toMember(row.author));
  const [avatarByPath, mediaByPath] = await Promise.all([
    signedUrls("avatars", members.map((member) => member.photo_path)),
    signedUrls("community-media", rows.flatMap((row) => (row.media ?? []).map((media: any) => media.storage_path))),
  ]);
  const items = rows.flatMap((row, index): CommunityGalleryItem[] => {
    const author = members[index];
    return [...(row.media ?? [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((media: any) => ({
        mediaId: media.id,
        url: mediaByPath.get(media.storage_path) ?? null,
        postId: row.id,
        content: row.content,
        createdAt: row.created_at,
        author,
        authorAvatarUrl: author.photo_path ? avatarByPath.get(author.photo_path) ?? null : null,
      }));
  });
  const lastRow = rows.at(-1);
  return {
    items,
    hasMore,
    nextCursor: lastRow ? { createdAt: lastRow.created_at, id: lastRow.id } : null,
  };
}
