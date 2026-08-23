import { Card } from "@/components/ui";
import { requirePermission } from "@/lib/auth/context";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { memberName } from "@/lib/utils/format";
import { TeamNoteForm, TeamNoteItem } from "../TasksClient";

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
  const avatarByPath = await signedUrls("avatars", normalized.map((note: any) => note.author?.photo_path));
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
    <Card>
      <h2 className="text-lg font-semibold text-graphite-900">Notes d'équipe</h2>
      <p className="mt-1 text-sm text-graphite-500">Communication interne visible par toute l'équipe.</p>
      <div className="mt-5"><TeamNoteForm /></div>
      {noteItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-graphite-400">Aucune note d'équipe.</p>
      ) : (
        <ul className="mt-5 divide-y divide-graphite-100 border-t border-graphite-100">
          {noteItems.map((note) => (
            <TeamNoteItem
              key={note.id}
              note={note}
              currentMembershipId={ctx.membership.id}
              currentMemberName={memberName(ctx.membership)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
