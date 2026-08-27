"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createTeamNote,
  createTeamNoteComment,
  deleteTeamNote,
  markTeamNoteExecuted,
  markTeamNoteRead,
} from "@/lib/actions/teamNotes";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { idle } from "@/lib/actions/result";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import { MemberIdentity, type MemberIdentityData } from "@/components/members/MemberIdentity";

interface NoteItem {
  id: string;
  author: MemberIdentityData;
  authorAvatarUrl: string | null;
  content: string;
  created_at: string;
  canDelete: boolean;
  readers: NoteReader[];
  executions: NoteExecution[];
  commentCount: number;
}

interface NoteReader {
  membership_id: string | null;
  reader_label: string;
  read_at: string;
}

interface NoteExecution {
  membership_id: string | null;
  executor_label: string;
  executed_at: string;
}

interface NoteComment {
  id: string;
  author_membership_id: string | null;
  author_label: string;
  author?: MemberIdentityData | null;
  authorAvatarUrl?: string | null;
  content: string;
  created_at: string;
}

interface NoteDetails {
  reads: NoteReader[];
  executions: NoteExecution[];
  comments: NoteComment[];
}

export function TeamNoteForm() {
  const [state, formAction] = useFormState(createTeamNote, idle);
  return (
    <form action={formAction} className="space-y-2">
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
      )}
      <textarea
        name="content"
        rows={2}
        required
        className="input"
        placeholder="Ex : Le client Martin préfère que nous passions avant 10h."
      />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Envoi…">Publier la note</SubmitButton>
      </div>
    </form>
  );
}

function namesSummary(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  return `${names[0]}, ${names[1]} et ${names.length - 2} autre${names.length - 2 > 1 ? "s" : ""}`;
}

function readSummary(readers: NoteReader[]): string | null {
  if (readers.length === 0) return null;
  return `Lu par ${namesSummary(readers.map((reader) => reader.reader_label))}`;
}

function executionSummary(executions: NoteExecution[]): string | null {
  if (executions.length === 0) return null;
  const names = namesSummary(executions.map((execution) => execution.executor_label));
  return executions.length === 1
    ? `${names} a exécuté cette tâche.`
    : `${names} ont exécuté cette tâche.`;
}

export function TeamNoteItem({
  note,
  currentMembershipId,
  currentMemberName,
}: {
  note: NoteItem;
  currentMembershipId: string;
  currentMemberName: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [readers, setReaders] = useState(note.readers);
  const [executions, setExecutions] = useState(note.executions);
  const [commentCount, setCommentCount] = useState(note.commentCount);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<NoteDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasRead = readers.some((reader) => reader.membership_id === currentMembershipId);
  const hasExecuted = executions.some((execution) => execution.membership_id === currentMembershipId);

  const loadDetails = async () => {
    setLoadingDetails(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/team-notes/${note.id}`, { cache: "no-store" });
      const data = await response.json() as NoteDetails & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Impossible de charger les détails.");
      setDetails(data);
      setReaders(data.reads);
      setExecutions(data.executions);
      setCommentCount(data.comments.length);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les détails.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleDetails = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !details) void loadDetails();
  };

  const addRead = () => {
    if (hasRead) return;
    start(async () => {
      const result = await markTeamNoteRead(note.id);
      if (!result.ok) {
        setMessage(result.message ?? "Impossible d'enregistrer la lecture.");
        return;
      }
      setReaders((current) => [
        ...current,
        { membership_id: currentMembershipId, reader_label: currentMemberName, read_at: new Date().toISOString() },
      ]);
      void loadDetails();
    });
  };

  const addExecution = () => {
    if (hasExecuted) return;
    start(async () => {
      const result = await markTeamNoteExecuted(note.id);
      if (!result.ok) {
        setMessage(result.message ?? "Impossible d'enregistrer l'exécution.");
        return;
      }
      setExecutions((current) => [
        ...current,
        { membership_id: currentMembershipId, executor_label: currentMemberName, executed_at: new Date().toISOString() },
      ]);
      void loadDetails();
    });
  };

  const addComment = async (content: string): Promise<boolean> => {
    const result = await createTeamNoteComment(note.id, content);
    if (!result.ok) {
      setMessage(result.message ?? "Impossible de publier le commentaire.");
      return false;
    }
    const comment: NoteComment = {
      id: `local-${Date.now()}`,
      author_membership_id: currentMembershipId,
      author_label: currentMemberName,
      content,
      created_at: new Date().toISOString(),
    };
    setDetails((current) => current ? { ...current, comments: [...current.comments, comment] } : current);
    setCommentCount((count) => count + 1);
    void loadDetails();
    return true;
  };

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <MemberIdentity member={note.author} avatarUrl={note.authorAvatarUrl} avatarSize={30} nameClassName="text-xs text-graphite-700" />
          <div className="ml-[42px] mt-0.5 text-xs text-graphite-400">{formatRelative(note.created_at)}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-graphite-800">{note.content}</p>
        </div>
        {note.canDelete && (
          <button
            type="button"
            disabled={pending}
            className="btn-ghost min-h-11 min-w-11 p-1 text-graphite-300 hover:text-red-500"
            aria-label="Supprimer la note"
            onClick={() => start(async () => { if (confirm("Supprimer cette note ?")) { await deleteTeamNote(note.id); router.refresh(); } })}
          >
            ✕
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || hasRead}
          onClick={addRead}
          className="btn-secondary min-h-11 px-3 py-1 text-xs"
          aria-pressed={hasRead}
        >
          {hasRead ? "Lu" : "Marquer comme lu"}
        </button>
        <button
          type="button"
          disabled={pending || hasExecuted}
          onClick={addExecution}
          className="btn-secondary min-h-11 px-3 py-1 text-xs"
          aria-pressed={hasExecuted}
        >
          Fait
        </button>
        <button
          type="button"
          onClick={toggleDetails}
          className="min-h-11 rounded-lg px-2 text-xs font-medium text-pool-700 hover:bg-pool-50 hover:text-pool-800"
          aria-expanded={open}
          aria-controls={`team-note-details-${note.id}`}
        >
          {open ? "Masquer les échanges" : commentCount > 0 ? `${commentCount} commentaire${commentCount > 1 ? "s" : ""}` : "Commenter"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-graphite-500">
        {readSummary(readers) && <button type="button" onClick={toggleDetails} aria-expanded={open} className="min-h-8 text-left hover:text-graphite-700">{readSummary(readers)}</button>}
        {executionSummary(executions) && <button type="button" onClick={toggleDetails} aria-expanded={open} className="min-h-8 text-left hover:text-graphite-700">{executionSummary(executions)}</button>}
      </div>
      {message && !open && <p className="mt-2 text-xs text-red-600" role="status">{message}</p>}
      {open && (
        <TeamNoteDetailsInline
          id={`team-note-details-${note.id}`}
          readers={readers}
          executions={executions}
          comments={details?.comments ?? []}
          loading={loadingDetails}
          pending={pending}
          message={message}
          onReload={loadDetails}
          onComment={(content) => new Promise<boolean>((resolve) => {
            start(() => { void addComment(content).then(resolve); });
          })}
        />
      )}
    </li>
  );
}

function TeamNoteDetailsInline({
  id,
  readers,
  executions,
  comments,
  loading,
  pending,
  message,
  onReload,
  onComment,
}: {
  id: string;
  readers: NoteReader[];
  executions: NoteExecution[];
  comments: NoteComment[];
  loading: boolean;
  pending: boolean;
  message: string | null;
  onReload: () => Promise<void>;
  onComment: (content: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    if (await onComment(trimmed)) setContent("");
  };

  return (
    <section id={id} aria-label="Échanges de la note" className="mt-3 space-y-5 rounded-xl border border-graphite-100 bg-graphite-50/70 p-3 sm:p-4">
          {message && <p className="text-sm text-red-600" role="status">{message}</p>}

          {loading ? (
            <div className="space-y-3 animate-pulse" aria-busy="true">
              <div className="h-14 rounded-xl bg-graphite-100" />
              <div className="h-20 rounded-xl bg-graphite-100" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <InteractionList title={`Lu (${readers.length})`} empty="Personne n'a encore marqué cette note comme lue." items={readers.map((reader) => ({ label: reader.reader_label, date: reader.read_at }))} />
                <InteractionList title={`Fait (${executions.length})`} empty="Cette tâche n'a pas encore été exécutée." items={executions.map((execution) => ({ label: execution.executor_label, date: execution.executed_at }))} />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-graphite-900">Commentaires ({comments.length})</h3>
                  <button type="button" className="text-xs font-medium text-pool-700 hover:text-pool-800" onClick={() => void onReload()}>Actualiser</button>
                </div>
                {comments.length === 0 ? (
                  <p className="rounded-xl bg-graphite-50 px-3 py-3 text-sm text-graphite-500">Aucun commentaire pour le moment.</p>
                ) : (
                  <ul className="space-y-3">
                    {comments.map((comment) => (
                      <li key={comment.id} className="rounded-xl bg-graphite-50 px-3 py-3">
                        {comment.author ? (
                          <>
                            <MemberIdentity member={comment.author} avatarUrl={comment.authorAvatarUrl} avatarSize={28} nameClassName="text-xs text-graphite-700" />
                            <div className="ml-[40px] mt-0.5 text-[11px] text-graphite-400">{formatDateTime(comment.created_at)}</div>
                          </>
                        ) : (
                          <div className="text-xs font-semibold text-graphite-600">{comment.author_label} <span className="font-normal text-graphite-400">· {formatDateTime(comment.created_at)}</span></div>
                        )}
                        <p className="mt-1 whitespace-pre-wrap text-sm text-graphite-800">{comment.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <form onSubmit={submit} className="border-t border-graphite-100 pt-4">
            <label htmlFor={`comment-${id}`} className="label">Ajouter un commentaire</label>
            <textarea
              id={`comment-${id}`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              maxLength={4000}
              className="input"
              placeholder="Écrivez un commentaire à l'équipe…"
              disabled={loading || pending}
            />
            <div className="mt-3 flex justify-end">
              <button type="submit" className="btn-primary" disabled={loading || pending || !content.trim()}>
                {pending ? "Publication…" : "Publier"}
              </button>
            </div>
          </form>
    </section>
  );
}

function InteractionList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ label: string; date: string }>;
}) {
  return (
    <div className="rounded-xl border border-graphite-100 p-3">
      <h3 className="text-sm font-semibold text-graphite-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-graphite-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, index) => (
            <li key={`${item.label}-${item.date}-${index}`} className="text-xs text-graphite-600">
              <span className="font-medium text-graphite-800">{item.label}</span> · {formatDateTime(item.date)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
