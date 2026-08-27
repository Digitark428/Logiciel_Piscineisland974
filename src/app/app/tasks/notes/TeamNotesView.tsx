"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberIdentity, type MemberIdentityData } from "@/components/members/MemberIdentity";
import {
  createTeamNote,
  createTeamNoteComment,
  deleteTeamNote,
  markTeamNoteExecuted,
  markTeamNoteRead,
} from "@/lib/actions/teamNotes";
import { idle, type ActionResult } from "@/lib/actions/result";
import {
  isTeamNoteResolved,
  teamNoteCommentLabel,
  teamNoteInteractionSummary,
} from "@/lib/team-notes";
import { formatDateTime, formatRelative, memberName } from "@/lib/utils/format";

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

export interface TeamNoteItemData {
  id: string;
  author: MemberIdentityData;
  authorAvatarUrl: string | null;
  content: string;
  created_at: string;
  canDelete: boolean;
  readers: NoteReader[];
  executions: NoteExecution[];
  commentCount: number;
  pendingCreation?: boolean;
}

function PenIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.7]">
      <path d="m4 14.8-.5 2.2 2.2-.5L15.8 6.4a1.7 1.7 0 0 0 0-2.4l-.7-.7a1.7 1.7 0 0 0-2.4 0L2.6 13.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11.5 4.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="m4.5 10.5 3.3 3.2 7.7-7.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
      <path d="M3.5 4.5h13v9h-8l-4 3v-3h-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.6]">
      <path d="M4 6h12M8 3.5h4M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.7]">
      <path d="m3 3 14 7-14 7 2.3-7L3 3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10H17" strokeLinecap="round" />
    </svg>
  );
}

function NoteComposer({ onPublish }: { onPublish: (content: string) => Promise<ActionResult> }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || publishing) return;
    setPublishing(true);
    setMessage(null);
    let result: ActionResult;
    try {
      result = await onPublish(trimmed);
    } catch {
      result = { ok: false, message: "Impossible de publier la note." };
    }
    setPublishing(false);
    if (!result.ok) {
      setMessage(result.message ?? "Impossible de publier la note.");
      return;
    }
    setContent("");
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-pool-100 bg-white px-4 text-left text-sm font-medium text-graphite-500 shadow-[0_6px_22px_rgba(24,58,89,0.035)] transition hover:border-pool-200 hover:bg-pool-50/35 hover:text-graphite-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300"
        aria-expanded="false"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pool-50 text-pool-700"><PenIcon /></span>
        Écrire une note à l’équipe…
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-pool-100 bg-white p-3 shadow-[0_8px_28px_rgba(24,58,89,0.05)] sm:p-4">
      <label htmlFor="team-note-content" className="sr-only">Écrire une note à l’équipe</label>
      <textarea
        ref={textareaRef}
        id="team-note-content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        maxLength={4000}
        required
        disabled={publishing}
        className="w-full resize-y rounded-xl border-0 bg-graphite-50/65 px-3.5 py-3 text-sm leading-6 text-graphite-900 outline-none ring-1 ring-inset ring-graphite-100 placeholder:text-graphite-400 focus:bg-white focus:ring-2 focus:ring-pool-300 disabled:opacity-60"
        placeholder="Partagez une information importante avec l’équipe…"
      />
      {message ? <p role="alert" className="mt-2 text-xs font-medium text-red-600">{message}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={publishing}
          onClick={() => {
            setExpanded(false);
            setMessage(null);
          }}
          className="min-h-11 rounded-xl px-3.5 text-sm font-medium text-graphite-500 transition hover:bg-graphite-50 hover:text-graphite-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-graphite-200"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={publishing || !content.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-coral-100 bg-coral-50 px-4 text-sm font-semibold text-coral-800 transition hover:border-coral-200 hover:bg-coral-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendIcon />
          {publishing ? "Publication…" : "Publier la note"}
        </button>
      </div>
    </form>
  );
}

function InteractionList({
  title,
  empty,
  items,
  tone,
}: {
  title: string;
  empty: string;
  items: Array<{ label: string; date: string }>;
  tone: "pool" | "mint";
}) {
  return (
    <div className="min-w-0">
      <h3 className={`text-xs font-semibold uppercase tracking-[0.12em] ${tone === "mint" ? "text-emerald-700" : "text-pool-700"}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-graphite-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={`${item.label}-${item.date}-${index}`} className="text-xs leading-5 text-graphite-500">
              <span className="font-medium text-graphite-700">{item.label}</span>
              <span className="text-graphite-300"> · </span>
              {formatDateTime(item.date)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TeamNoteDetailsInline({
  id,
  readers,
  executions,
  comments,
  loading,
  commentPending,
  message,
  onReload,
  onComment,
}: {
  id: string;
  readers: NoteReader[];
  executions: NoteExecution[];
  comments: NoteComment[];
  loading: boolean;
  commentPending: boolean;
  message: string | null;
  onReload: () => Promise<void>;
  onComment: (content: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || commentPending) return;
    if (await onComment(trimmed)) setContent("");
  };

  return (
    <section id={id} aria-label="Échanges de la note" className="mt-4 rounded-2xl border border-pool-100/80 bg-pool-50/25 px-3.5 py-4 sm:px-5">
      {message ? <p className="mb-3 text-sm font-medium text-red-600" role="status">{message}</p> : null}

      {loading ? (
        <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Chargement des échanges">
          <div className="h-10 rounded-xl bg-pool-100/60" />
          <div className="h-16 rounded-xl bg-pool-100/45" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 border-b border-pool-100/80 pb-4 sm:grid-cols-2 sm:gap-6">
            <InteractionList
              title={`Lectures · ${readers.length}`}
              empty="Aucune lecture enregistrée."
              items={readers.map((reader) => ({ label: reader.reader_label, date: reader.read_at }))}
              tone="pool"
            />
            <InteractionList
              title={`Fait · ${executions.length}`}
              empty="Cette information n’est pas encore marquée comme traitée."
              items={executions.map((execution) => ({ label: execution.executor_label, date: execution.executed_at }))}
              tone="mint"
            />
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-graphite-800">Commentaires <span className="font-normal text-graphite-400">({comments.length})</span></h3>
              <button type="button" className="min-h-11 rounded-lg px-2 text-xs font-medium text-pool-700 hover:bg-pool-50 hover:text-pool-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300" onClick={() => void onReload()}>
                Actualiser
              </button>
            </div>
            {comments.length === 0 ? (
              <p className="py-4 text-sm text-graphite-400">Aucun commentaire pour le moment.</p>
            ) : (
              <ul className="mt-2 divide-y divide-pool-100/80">
                {comments.map((comment) => (
                  <li key={comment.id} className="py-3 first:pt-2 last:pb-1">
                    {comment.author ? (
                      <MemberIdentity
                        member={comment.author}
                        avatarUrl={comment.authorAvatarUrl}
                        avatarSize={30}
                        variant="feed"
                        nameClassName="text-xs"
                        meta={<time dateTime={comment.created_at}>{formatRelative(comment.created_at)}</time>}
                      />
                    ) : (
                      <div className="text-xs font-semibold text-graphite-700">
                        {comment.author_label}<span className="ml-1 font-normal text-graphite-400">· {formatRelative(comment.created_at)}</span>
                      </div>
                    )}
                    <p className={`${comment.author ? "ml-[42px]" : ""} mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-graphite-700`}>{comment.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 border-t border-pool-100/80 pt-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={`comment-${id}`} className="sr-only">Ajouter un commentaire</label>
          <textarea
            id={`comment-${id}`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            maxLength={4000}
            className="w-full resize-y rounded-xl border border-graphite-100 bg-white px-3.5 py-2.5 text-sm leading-5 text-graphite-800 outline-none placeholder:text-graphite-400 focus:border-pool-200 focus:ring-2 focus:ring-pool-200 disabled:opacity-60"
            placeholder="Écrire un commentaire…"
            disabled={loading || commentPending}
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-pool-100 bg-white px-4 text-sm font-semibold text-pool-700 transition hover:border-pool-200 hover:bg-pool-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || commentPending || !content.trim()}
        >
          <SendIcon />
          {commentPending ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </section>
  );
}

function TeamNoteCard({
  note,
  currentMembershipId,
  currentMember,
  currentMemberAvatarUrl,
  onRemove,
}: {
  note: TeamNoteItemData;
  currentMembershipId: string;
  currentMember: MemberIdentityData;
  currentMemberAvatarUrl: string | null;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const [readers, setReaders] = useState(note.readers);
  const [executions, setExecutions] = useState(note.executions);
  const [commentCount, setCommentCount] = useState(note.commentCount);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<NoteDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [readPending, setReadPending] = useState(false);
  const [executionPending, setExecutionPending] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const currentMemberName = memberName(currentMember);
  const hasRead = readers.some((reader) => reader.membership_id === currentMembershipId);
  const hasExecuted = executions.some((execution) => execution.membership_id === currentMembershipId);
  const isResolved = isTeamNoteResolved(executions.length);

  useEffect(() => {
    setReaders(note.readers);
    setExecutions(note.executions);
    setCommentCount(note.commentCount);
  }, [note.readers, note.executions, note.commentCount]);

  const loadDetails = useCallback(async () => {
    if (note.pendingCreation) return;
    setLoadingDetails(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/team-notes/${note.id}`, { cache: "no-store" });
      const data = await response.json() as NoteDetails & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Impossible de charger les échanges.");
      setDetails(data);
      setReaders(data.reads);
      setExecutions(data.executions);
      setCommentCount(data.comments.length);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les échanges.");
    } finally {
      setLoadingDetails(false);
    }
  }, [note.id, note.pendingCreation]);

  const toggleDetails = () => {
    if (note.pendingCreation) return;
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !details) void loadDetails();
  };

  const addRead = async () => {
    if (hasRead || readPending || note.pendingCreation) return;
    const optimistic: NoteReader = {
      membership_id: currentMembershipId,
      reader_label: currentMemberName,
      read_at: new Date().toISOString(),
    };
    setReadPending(true);
    setMessage(null);
    setReaders((current) => [...current, optimistic]);
    setDetails((current) => current ? { ...current, reads: [...current.reads, optimistic] } : current);
    let result: ActionResult;
    try {
      result = await markTeamNoteRead(note.id);
    } catch {
      result = { ok: false, message: "Impossible d’enregistrer la lecture." };
    }
    setReadPending(false);
    if (!result.ok) {
      setReaders((current) => current.filter((reader) => reader !== optimistic));
      setDetails((current) => current ? { ...current, reads: current.reads.filter((reader) => reader !== optimistic) } : current);
      setMessage(result.message ?? "Impossible d’enregistrer la lecture.");
    }
  };

  const addExecution = async () => {
    if (hasExecuted || executionPending || note.pendingCreation) return;
    const optimistic: NoteExecution = {
      membership_id: currentMembershipId,
      executor_label: currentMemberName,
      executed_at: new Date().toISOString(),
    };
    setExecutionPending(true);
    setMessage(null);
    setExecutions((current) => [...current, optimistic]);
    setDetails((current) => current ? { ...current, executions: [...current.executions, optimistic] } : current);
    let result: ActionResult;
    try {
      result = await markTeamNoteExecuted(note.id);
    } catch {
      result = { ok: false, message: "Impossible d’enregistrer l’exécution." };
    }
    setExecutionPending(false);
    if (!result.ok) {
      setExecutions((current) => current.filter((execution) => execution !== optimistic));
      setDetails((current) => current ? { ...current, executions: current.executions.filter((execution) => execution !== optimistic) } : current);
      setMessage(result.message ?? "Impossible d’enregistrer l’exécution.");
    }
  };

  const addComment = async (content: string): Promise<boolean> => {
    if (commentPending || !details) return false;
    const optimistic: NoteComment = {
      id: `local-comment-${Date.now()}`,
      author_membership_id: currentMembershipId,
      author_label: currentMemberName,
      author: currentMember,
      authorAvatarUrl: currentMemberAvatarUrl,
      content,
      created_at: new Date().toISOString(),
    };
    setCommentPending(true);
    setMessage(null);
    setDetails((current) => current ? { ...current, comments: [...current.comments, optimistic] } : current);
    setCommentCount((count) => count + 1);
    let result: ActionResult;
    try {
      result = await createTeamNoteComment(note.id, content);
    } catch {
      result = { ok: false, message: "Impossible de publier le commentaire." };
    }
    setCommentPending(false);
    if (!result.ok) {
      setDetails((current) => current ? { ...current, comments: current.comments.filter((comment) => comment.id !== optimistic.id) } : current);
      setCommentCount((count) => Math.max(0, count - 1));
      setMessage(result.message ?? "Impossible de publier le commentaire.");
      return false;
    }
    return true;
  };

  const remove = async () => {
    if (!note.canDelete || deletePending || note.pendingCreation || !confirm("Supprimer cette note ?")) return;
    setDeletePending(true);
    setMessage(null);
    let result: ActionResult;
    try {
      result = await deleteTeamNote(note.id);
    } catch {
      result = { ok: false, message: "Suppression impossible." };
    }
    if (!result.ok) {
      setDeletePending(false);
      setMessage(result.message ?? "Suppression impossible.");
      return;
    }
    onRemove(note.id);
    router.refresh();
  };

  const actionBase = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55";

  return (
    <li className={`rounded-[18px] border px-4 py-4 shadow-[0_7px_24px_rgba(24,58,89,0.035)] transition sm:px-5 ${isResolved ? "border-emerald-100 bg-emerald-50/45" : "border-pool-100/80 bg-white hover:border-pool-200 hover:shadow-[0_9px_28px_rgba(24,58,89,0.05)]"} ${deletePending ? "opacity-55" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <MemberIdentity
          member={note.author}
          avatarUrl={note.authorAvatarUrl}
          avatarSize={36}
          variant="feed"
          nameClassName="text-sm"
          meta={note.pendingCreation ? <span className="text-coral-600">Publication…</span> : <time dateTime={note.created_at} title={formatDateTime(note.created_at)}>{formatRelative(note.created_at)}</time>}
        />
        <div className="flex shrink-0 items-center gap-1">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><CheckIcon />Traité</span>
          ) : null}
          {note.canDelete && !note.pendingCreation ? (
            <button
              type="button"
              disabled={deletePending}
              onClick={() => void remove()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2.5 text-graphite-300 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              aria-label="Supprimer la note"
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </div>

      <p className={`mt-3 whitespace-pre-wrap break-words text-[15px] font-medium leading-6 sm:text-base ${isResolved ? "text-graphite-600" : "text-graphite-900"}`}>{note.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-graphite-100/80 pt-3">
        <button
          type="button"
          disabled={readPending || hasRead || note.pendingCreation}
          onClick={() => void addRead()}
          className={`${actionBase} ${hasRead ? "border-pool-100 bg-pool-50 text-pool-700 ring-pool-300" : "border-graphite-100 bg-white text-graphite-700 hover:border-pool-200 hover:bg-pool-50/55 ring-pool-300"}`}
          aria-pressed={hasRead}
        >
          {hasRead ? <CheckIcon /> : null}
          {readPending ? "Lecture…" : hasRead ? "Lu" : "Marquer comme lu"}
        </button>
        <button
          type="button"
          disabled={executionPending || hasExecuted || note.pendingCreation}
          onClick={() => void addExecution()}
          className={`${actionBase} ${hasExecuted ? "border-emerald-100 bg-emerald-50 text-emerald-700 ring-emerald-300" : "border-graphite-100 bg-white text-graphite-700 hover:border-emerald-200 hover:bg-emerald-50/55 ring-emerald-300"}`}
          aria-pressed={hasExecuted}
        >
          {hasExecuted ? <CheckIcon /> : null}
          {executionPending ? "Validation…" : "Fait"}
        </button>
        <button
          type="button"
          onClick={toggleDetails}
          disabled={note.pendingCreation}
          className={`${actionBase} border-transparent bg-transparent text-pool-700 hover:border-pool-100 hover:bg-pool-50 ring-pool-300`}
          aria-expanded={open}
          aria-controls={`team-note-details-${note.id}`}
        >
          <CommentIcon />
          {open ? "Masquer" : teamNoteCommentLabel(commentCount)}
        </button>
      </div>

      {!note.pendingCreation && (readers.length > 0 || executions.length > 0) ? (
        <button
          type="button"
          onClick={toggleDetails}
          className="mt-2 min-h-11 rounded-lg px-1 text-left text-xs text-graphite-400 transition hover:text-graphite-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-300"
          aria-expanded={open}
          aria-controls={`team-note-details-${note.id}`}
        >
          {teamNoteInteractionSummary(readers.length, executions.length)}
        </button>
      ) : null}

      {message && !open ? <p className="mt-2 text-xs font-medium text-red-600" role="status">{message}</p> : null}
      {open ? (
        <TeamNoteDetailsInline
          id={`team-note-details-${note.id}`}
          readers={readers}
          executions={executions}
          comments={details?.comments ?? []}
          loading={loadingDetails}
          commentPending={commentPending}
          message={message}
          onReload={loadDetails}
          onComment={addComment}
        />
      ) : null}
    </li>
  );
}

export function TeamNotesView({
  initialNotes,
  currentMembershipId,
  currentMember,
  currentMemberAvatarUrl,
}: {
  initialNotes: TeamNoteItemData[];
  currentMembershipId: string;
  currentMember: MemberIdentityData;
  currentMemberAvatarUrl: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const router = useRouter();

  useEffect(() => setNotes(initialNotes), [initialNotes]);

  const publish = async (content: string): Promise<ActionResult> => {
    const optimisticId = `local-note-${Date.now()}`;
    const optimistic: TeamNoteItemData = {
      id: optimisticId,
      author: currentMember,
      authorAvatarUrl: currentMemberAvatarUrl,
      content,
      created_at: new Date().toISOString(),
      canDelete: false,
      readers: [],
      executions: [],
      commentCount: 0,
      pendingCreation: true,
    };
    setNotes((current) => [optimistic, ...current]);
    const formData = new FormData();
    formData.set("content", content);
    let result: ActionResult;
    try {
      result = await createTeamNote(idle, formData);
    } catch {
      result = { ok: false, message: "Impossible de publier la note." };
    }
    if (!result.ok) {
      setNotes((current) => current.filter((note) => note.id !== optimisticId));
      return result;
    }
    router.refresh();
    return result;
  };

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-graphite-900 sm:text-[1.75rem]">Notes d’équipe</h1>
        <p className="mt-1.5 text-sm leading-6 text-graphite-500">Informations internes partagées avec toute l’équipe.</p>
      </header>

      <div className="mt-5"><NoteComposer onPublish={publish} /></div>

      {notes.length === 0 ? (
        <div className="mt-5 rounded-[18px] border border-dashed border-pool-100 bg-white/70 px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-pool-50 text-pool-600"><PenIcon /></span>
          <h2 className="mt-3 text-sm font-semibold text-graphite-700">Aucune note d’équipe</h2>
          <p className="mt-1 text-sm text-graphite-400">La première information partagée apparaîtra ici.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {notes.map((note) => (
            <TeamNoteCard
              key={note.id}
              note={note}
              currentMembershipId={currentMembershipId}
              currentMember={currentMember}
              currentMemberAvatarUrl={currentMemberAvatarUrl}
              onRemove={(id) => setNotes((current) => current.filter((item) => item.id !== id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
