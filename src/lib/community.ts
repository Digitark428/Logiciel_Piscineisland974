import "server-only";

import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import type { SessionContext } from "@/lib/auth/context";
import {
  COMMUNITY_REACTIONS,
  type CommunityCursor,
  type CommunityFeedItem,
  type CommunityMember,
  type CommunityReactionKind,
} from "@/lib/community-types";

export const COMMUNITY_INITIAL_POSTS = 5;
export const COMMUNITY_MORE_POSTS = 4;

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

/** Page de feed par curseur : aucune publication historique n'est préchargée. */
export async function getCommunityFeedPage(
  ctx: SessionContext,
  limit: number,
  cursor?: CommunityCursor,
): Promise<{ items: CommunityFeedItem[]; hasMore: boolean }> {
  const supabase = createClient();
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
