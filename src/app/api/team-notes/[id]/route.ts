import { NextResponse } from "next/server";
import { can, getSessionContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/**
 * Détails d'une note, demandés uniquement à l'ouverture de sa fiche.
 * Les listes ne transportent donc pas tous les commentaires à chaque navigation.
 */
export async function GET(_request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  if (!can(ctx, "tasks.view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const supabase = await createClient();
  const { data: note, error: noteError } = await supabase
    .from("team_notes")
    .select("id")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (noteError) return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  if (!note) return NextResponse.json({ error: "Note introuvable." }, { status: 404 });

  const [readsRes, executionsRes, commentsRes] = await Promise.all([
    supabase
      .from("team_note_reads")
      .select("membership_id, reader_label, read_at")
      .eq("workspace_id", ctx.workspace.id)
      .eq("team_note_id", note.id)
      .order("read_at"),
    supabase
      .from("team_note_executions")
      .select("membership_id, executor_label, executed_at")
      .eq("workspace_id", ctx.workspace.id)
      .eq("team_note_id", note.id)
      .order("executed_at"),
    supabase
      .from("team_note_comments")
      .select("id, author_membership_id, author_label, content, created_at, author:memberships!team_note_comments_author_membership_id_fkey(first_name,last_name,email,role,job_title,photo_path)")
      .eq("workspace_id", ctx.workspace.id)
      .eq("team_note_id", note.id)
      .order("created_at"),
  ]);

  if (readsRes.error || executionsRes.error || commentsRes.error) {
    return NextResponse.json({ error: "Lecture des interactions impossible." }, { status: 500 });
  }

  const comments = (commentsRes.data ?? []).map((comment: any) => ({
    ...comment,
    author: firstRelation(comment.author),
  }));
  const avatarByPath = await signedUrls("avatars", comments.map((comment: any) => comment.author?.photo_path));

  return NextResponse.json(
    {
      reads: readsRes.data ?? [],
      executions: executionsRes.data ?? [],
      comments: comments.map((comment: any) => ({
        ...comment,
        authorAvatarUrl: comment.author?.photo_path ? avatarByPath.get(comment.author.photo_path) ?? null : null,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
