import { requirePermission } from "@/lib/auth/context";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { TeamNotesView } from "./TeamNotesView";

export const dynamic = "force-dynamic";

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function TeamNotesPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = createClient();
  const { data: notes } = await supabase
    .from("team_notes")
    .select(
      "id,content,created_at,author_membership_id,author:memberships!team_notes_author_membership_id_fkey(id,first_name,last_name,email,role,job_title,photo_path), " +
      "reads:team_note_reads(membership_id,reader_label,read_at), " +
      "executions:team_note_executions(membership_id,executor_label,executed_at), " +
      "comments:team_note_comments(count)",
    )
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  const normalized = (notes ?? []).map((note: any) => ({ ...note, author: relationOne(note.author) }));
  const avatarByPath = await signedUrls("avatars", [
    ...normalized.map((note: any) => note.author?.photo_path),
    ctx.membership.photo_path,
  ]);
  const noteItems = normalized.map((note: any) => ({
    id: note.id,
    author: note.author ?? { first_name: null, last_name: null, email: "Membre", role: null, job_title: null },
    authorAvatarUrl: note.author?.photo_path ? avatarByPath.get(note.author.photo_path) ?? null : null,
    content: note.content,
    created_at: note.created_at,
    canDelete: ctx.isAdmin || note.author_membership_id === ctx.membership.id,
    readers: note.reads ?? [],
    executions: note.executions ?? [],
    commentCount: Number(note.comments?.[0]?.count ?? 0),
  }));

  return (
    <TeamNotesView
      initialNotes={noteItems}
      currentMembershipId={ctx.membership.id}
      currentMember={ctx.membership}
      currentMemberAvatarUrl={ctx.membership.photo_path ? avatarByPath.get(ctx.membership.photo_path) ?? null : null}
    />
  );
}
