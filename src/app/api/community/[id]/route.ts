import { NextResponse } from "next/server";
import { can, getSessionContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/** Commentaires chargés à la demande : le feed initial reste léger. */
export async function GET(_request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  if (!can(ctx, "community.view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from("community_posts")
    .select("id")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();
  if (postError) return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  if (!post) return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });

  const { data: comments, error } = await supabase
    .from("community_post_comments")
    .select(
      "id, content, created_at, author_membership_id, " +
        "author:memberships!community_post_comments_author_membership_id_fkey(id,first_name,last_name,email,role,job_title,photo_path)",
    )
    .eq("workspace_id", ctx.workspace.id)
    .eq("post_id", post.id)
    .order("created_at")
    .limit(100);
  if (error) return NextResponse.json({ error: "Commentaires indisponibles." }, { status: 500 });

  const normalizedComments = (comments ?? []).map((comment: any) => ({
    ...comment,
    author: firstRelation(comment.author),
  }));
  const avatarByPath = await signedUrls("avatars", normalizedComments.map((comment: any) => comment.author?.photo_path));
  return NextResponse.json(
    {
      comments: normalizedComments.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        authorMembershipId: comment.author_membership_id,
        author: {
          id: String(comment.author?.id ?? ""),
          first_name: comment.author?.first_name ?? null,
          last_name: comment.author?.last_name ?? null,
          email: comment.author?.email ?? null,
          role: comment.author?.role === "admin" ? "admin" : comment.author?.role === "member" ? "member" : null,
          job_title: comment.author?.job_title ?? null,
          photo_path: comment.author?.photo_path ?? null,
        },
        authorAvatarUrl: comment.author?.photo_path ? avatarByPath.get(comment.author.photo_path) ?? null : null,
        canDelete: ctx.isAdmin || comment.author_membership_id === ctx.membership.id,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
