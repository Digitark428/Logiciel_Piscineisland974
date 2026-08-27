"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import {
  createCommunityComment,
  createCommunityPost,
  createCommunityUploadSession,
  deleteCommunityComment,
  deleteCommunityPost,
  loadMoreCommunityPosts,
  toggleCommunityReaction,
} from "@/lib/actions/community";
import { createClient } from "@/lib/supabase/client";
import {
  COMMUNITY_REACTIONS,
  type CommunityCommentItem,
  type CommunityFeedItem,
  type CommunityReactionKind,
} from "@/lib/community-types";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import { communityTextParts } from "@/lib/community-search";
import { CommunityLightbox, type CommunityLightboxPhoto } from "./CommunityLightbox";

const REACTION_LABELS: Record<CommunityReactionKind, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "J'aime" },
  love: { emoji: "❤️", label: "J'adore" },
  laugh: { emoji: "😂", label: "Mort de rire" },
};

const MAX_IMAGES = 4;
const MAX_SOURCE_BYTES = 35 * 1024 * 1024;

type SelectedPhoto = { id: string; file: File; previewUrl: string };

export function CommunityFeed({
  initialItems,
  initialHasMore,
  canPublish,
  searchQuery,
}: {
  initialItems: CommunityFeedItem[];
  initialHasMore: boolean;
  canPublish: boolean;
  searchQuery: string;
}) {
  const [posts, setPosts] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, startLoadMore] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPosts(initialItems);
    setHasMore(initialHasMore);
  }, [initialHasMore, initialItems]);

  const loadMore = () => {
    const last = posts.at(-1);
    if (!last) return;
    setMessage(null);
    startLoadMore(async () => {
      const result = await loadMoreCommunityPosts({ createdAt: last.createdAt, id: last.id }, searchQuery);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setPosts((current) => [...current, ...result.items.filter((item) => !current.some((post) => post.id === item.id))]);
      setHasMore(result.hasMore);
    });
  };

  return (
    <div className="mx-auto max-w-[820px] space-y-5 sm:space-y-6">
      <PostComposer
        canPublish={canPublish}
        onCreated={(post) => setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)])}
      />
      {posts.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <div className="text-3xl">💬</div>
          <h2 className="mt-3 text-base font-semibold text-graphite-900">{searchQuery ? "Aucun résultat" : "La vie de l'équipe commence ici"}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-graphite-500">
            {searchQuery ? `Aucune publication ne correspond à « ${searchQuery} ».` : "Partagez une photo de chantier, une bonne nouvelle ou un petit mot avec votre équipe."}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <CommunityPostCard
            key={post.id}
            post={post}
            canPublish={canPublish}
            onPostsChange={setPosts}
            onDeleted={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
          />
        ))
      )}

      {message && <p className="text-center text-sm text-red-600" role="status">{message}</p>}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <button type="button" className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Chargement…" : "Voir plus"}
          </button>
        </div>
      )}
    </div>
  );
}

function PostComposer({ canPublish, onCreated }: { canPublish: boolean; onCreated: (post: CommunityFeedItem) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<SelectedPhoto[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    selectedRef.current = photos;
  }, [photos]);
  useEffect(() => () => selectedRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  const clearPhotos = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pickImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSuccess(false);
    const picked = Array.from(event.target.files ?? []);
    // Le sélecteur fournit un indice d'usage, mais certains Android renvoient un MIME vide
    // ou générique : seule la validation binaire serveur décide si le fichier est une image.
    const valid = picked.filter((file) => file.size > 0 && file.size <= MAX_SOURCE_BYTES);
    const available = Math.max(0, MAX_IMAGES - photos.length);
    const retained = valid.slice(0, available).map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...retained]);
    setExpanded(true);
    if (valid.length !== picked.length) setMessage("Certaines images n'ont pas été retenues. Chaque photo doit peser moins de 35 Mo.");
    else if (valid.length > available) setMessage(`Vous pouvez ajouter jusqu'à ${MAX_IMAGES} photos.`);
    else setMessage(null);
    event.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() && photos.length === 0) return;
    setMessage(null);
    setSuccess(false);
    start(async () => {
      try {
        let uploaded: Array<{ path: string; originalName: string }> = [];
        let uploadFailures = 0;
        if (photos.length > 0) {
          setProgress("Préparation des photos…");
          const session = await createCommunityUploadSession(photos.map(({ file }) => ({ name: file.name || "photo", size: file.size, type: file.type })));
          if (!session.ok || !session.uploads || session.uploads.length !== photos.length) {
            setMessage(session.message ?? "Impossible de préparer les photos.");
            return;
          }

          const supabase = createClient();
          let completed = 0;
          const results = await Promise.all(photos.map(async (photo, index) => {
            const ticket = session.uploads![index];
            const { error } = await supabase.storage.from("community-media").uploadToSignedUrl(
              ticket.path,
              ticket.token,
              photo.file,
              { contentType: photo.file.type || "application/octet-stream", cacheControl: "300", upsert: false },
            );
            completed += 1;
            setProgress(`Envoi des photos… ${completed}/${photos.length}`);
            return error ? null : { path: ticket.path, originalName: photo.file.name || "photo" };
          }));
          uploaded = results.filter((item): item is { path: string; originalName: string } => item !== null);
          uploadFailures = photos.length - uploaded.length;
          if (uploaded.length === 0 && !content.trim()) {
            setMessage("Impossible d'envoyer cette photo. Vérifiez votre connexion et réessayez.");
            return;
          }
        }

        setProgress(photos.length > 0 ? "Optimisation des photos…" : "Publication…");
        const result = await createCommunityPost({ content, uploads: uploaded });
        if (!result.ok) {
          setMessage(result.message ?? "La publication n'a pas abouti. Réessayez dans quelques instants.");
          return;
        }
        if (result.post) onCreated(result.post);
        setContent("");
        clearPhotos();
        setExpanded(false);
        setSuccess(true);
        const totalSkipped = uploadFailures + (result.skippedCount ?? 0);
        setMessage(totalSkipped > 0
          ? `Publication ajoutée. ${totalSkipped} photo${totalSkipped > 1 ? "s n'ont" : " n'a"} pas pu être traitée.`
          : "Publication ajoutée.");
        router.refresh();
      } catch {
        setMessage("Impossible de publier pour le moment. Réessayez dans quelques instants.");
      } finally {
        setProgress(null);
      }
    });
  };

  if (!expanded) {
    return (
      <div>
        <div className="community-composer card flex items-center gap-2 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={!canPublish}
            className="min-h-11 min-w-0 flex-1 rounded-xl bg-graphite-50 px-4 text-left text-sm text-graphite-500 ring-1 ring-inset ring-graphite-100 transition hover:bg-pool-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {canPublish ? "Partager quelque chose avec l'équipe…" : "La publication est réservée aux membres autorisés."}
          </button>
          {canPublish && (
            <button type="button" onClick={() => inputRef.current?.click()} className="community-photo-action min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-pool-800 sm:px-4">
              <span aria-hidden>▧</span> <span className="hidden sm:inline">Photos</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*,.avif,.heic,.heif" multiple className="sr-only" disabled={!canPublish} onChange={pickImages} />
        </div>
        {message && <p className={`mt-2 px-2 text-sm ${success ? "text-emerald-700" : "text-red-600"}`} role="status">{message}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="community-composer card p-4 sm:p-5">
      <label htmlFor="community-content" className="sr-only">Votre publication</label>
      <textarea
        id="community-content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={!canPublish || pending}
        rows={4}
        maxLength={2000}
        autoFocus
        className="input resize-none border-0 bg-graphite-50 text-[15px] leading-6 focus:ring-1"
        placeholder="Partager quelque chose avec l'équipe…"
      />
      <p className="mt-2 text-xs text-graphite-400">Ajoutez un hashtag comme <span className="font-medium text-pool-700">#installation</span> pour retrouver facilement ce moment.</p>
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <PhotoPreview key={photo.id} photo={photo} index={index} onRemove={() => removePhoto(photo.id)} disabled={pending} />
          ))}
        </div>
      )}
      {message && <p className={`mt-3 text-sm ${success ? "text-emerald-700" : "text-red-600"}`} role="status">{message}</p>}
      {progress && <p className="mt-3 text-sm font-medium text-pool-800" role="status">{progress}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-graphite-100 pt-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => inputRef.current?.click()} className="community-photo-action min-h-11 rounded-xl px-3 text-sm font-semibold text-pool-800" disabled={pending || photos.length >= MAX_IMAGES}>
            <span aria-hidden>▧</span> Photos <span className="text-xs font-normal text-graphite-400">{photos.length}/{MAX_IMAGES}</span>
          </button>
          {!content && photos.length === 0 && (
            <button type="button" className="btn-ghost min-h-11 px-3 text-sm" onClick={() => setExpanded(false)} disabled={pending}>Annuler</button>
          )}
        </div>
        <button type="submit" className="community-publish-button min-h-11 rounded-xl px-5 text-sm font-semibold text-graphite-900" disabled={pending || (!content.trim() && photos.length === 0)}>
          {pending ? "Publication…" : "Publier"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*,.avif,.heic,.heif" multiple className="sr-only" disabled={!canPublish || pending} onChange={pickImages} />
    </form>
  );
}

function PhotoPreview({ photo, index, onRemove, disabled }: { photo: SelectedPhoto; index: number; onRemove: () => void; disabled: boolean }) {
  const [readable, setReadable] = useState(true);
  return (
    <figure className="relative aspect-square overflow-hidden rounded-xl bg-pool-50 ring-1 ring-graphite-100">
      {readable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.previewUrl} alt={`Photo sélectionnée ${index + 1}`} className="h-full w-full object-cover" onError={() => setReadable(false)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-2 text-center text-xs text-graphite-500">
          <span className="text-xl" aria-hidden>▧</span>
          <span className="mt-1 line-clamp-2">Aperçu après envoi</span>
        </div>
      )}
      <button type="button" onClick={onRemove} disabled={disabled} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg text-graphite-700 shadow-card ring-1 ring-graphite-100" aria-label={`Retirer la photo ${index + 1}`}>×</button>
    </figure>
  );
}

function CommunityPostCard({
  post,
  canPublish,
  onPostsChange,
  onDeleted,
}: {
  post: CommunityFeedItem;
  canPublish: boolean;
  onPostsChange: React.Dispatch<React.SetStateAction<CommunityFeedItem[]>>;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [comments, setComments] = useState<CommunityCommentItem[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxPhotos: CommunityLightboxPhoto[] = post.media.flatMap((media) => media.url ? [{
    id: media.id,
    url: media.url,
    content: post.content,
    createdAt: post.createdAt,
    author: post.author,
    authorAvatarUrl: post.authorAvatarUrl,
  }] : []);

  const loadComments = async () => {
    setCommentsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/community/${post.id}`, { cache: "no-store" });
      const body = await response.json() as { comments?: CommunityCommentItem[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Impossible de charger les commentaires.");
      const nextComments = body.comments ?? [];
      setComments(nextComments);
      onPostsChange((current) => current.map((item) => item.id === post.id ? { ...item, commentCount: nextComments.length } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les commentaires.");
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen && !comments) void loadComments();
  };

  const updateReaction = (reaction: CommunityReactionKind, active: boolean) => {
    onPostsChange((current) => current.map((item) => {
      if (item.id !== post.id) return item;
      const wasActive = item.currentReactions.includes(reaction);
      if (wasActive === active) return item;
      return {
        ...item,
        currentReactions: active ? [...item.currentReactions, reaction] : item.currentReactions.filter((value) => value !== reaction),
        reactionCounts: { ...item.reactionCounts, [reaction]: Math.max(0, item.reactionCounts[reaction] + (active ? 1 : -1)) },
      };
    }));
  };

  const react = (reaction: CommunityReactionKind) => {
    if (!canPublish || pending) return;
    const wasActive = post.currentReactions.includes(reaction);
    setMessage(null);
    updateReaction(reaction, !wasActive);
    start(async () => {
      const result = await toggleCommunityReaction(post.id, reaction);
      if (!result.ok || result.active === undefined) {
        updateReaction(reaction, wasActive);
        setMessage(result.message ?? "Réaction impossible.");
        return;
      }
      updateReaction(reaction, result.active);
    });
  };

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = comment.trim();
    if (!value) return;
    setMessage(null);
    start(async () => {
      const result = await createCommunityComment(post.id, value);
      if (!result.ok) {
        setMessage(result.message ?? "Commentaire impossible.");
        return;
      }
      setComment("");
      await loadComments();
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm("Supprimer cette publication et ses commentaires ?")) return;
    setMessage(null);
    start(async () => {
      const result = await deleteCommunityPost(post.id);
      if (!result.ok) {
        setMessage(result.message ?? "Suppression impossible.");
        return;
      }
      onDeleted(post.id);
      router.refresh();
    });
  };

  const removeComment = (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    setMessage(null);
    start(async () => {
      const result = await deleteCommunityComment(commentId);
      if (!result.ok) {
        setMessage(result.message ?? "Suppression impossible.");
        return;
      }
      await loadComments();
      router.refresh();
    });
  };

  return (
    <article id={`community-post-${post.id}`} className="community-post-card card scroll-mt-24 p-0">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <MemberIdentity
            member={post.author}
            avatarUrl={post.authorAvatarUrl}
            avatarSize={44}
            variant="feed"
            roleTone={post.author.role === "admin" ? "coral" : "aqua"}
            meta={<time title={formatDateTime(post.createdAt)}>{formatRelative(post.createdAt)}</time>}
          />
          {post.canDelete && (
            <details className="community-post-menu relative -mr-1">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-xl tracking-widest text-graphite-500 transition hover:bg-graphite-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-400" aria-label="Actions de la publication">•••</summary>
              <div data-leti-overlay="popover" className="absolute right-0 top-11 z-[var(--leti-layer-popover)] min-w-44 rounded-xl border border-graphite-100 bg-white p-1.5 shadow-float">
                <button type="button" disabled={pending} onClick={remove} className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50">Supprimer la publication</button>
              </div>
            </details>
          )}
        </div>
        {post.content && <CommunityText content={post.content} className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-graphite-800" />}
      </div>

      {lightboxPhotos.length > 0 && <PostMedia photos={lightboxPhotos} onOpen={setLightboxIndex} />}

      <div className="border-t border-graphite-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {COMMUNITY_REACTIONS.map((reaction) => {
            const active = post.currentReactions.includes(reaction);
            const meta = REACTION_LABELS[reaction];
            return (
              <button
                key={reaction}
                type="button"
                disabled={!canPublish || pending}
                onClick={() => react(reaction)}
                aria-pressed={active}
                className={`community-reaction-chip ${active ? "community-reaction-chip--active" : ""}`}
              >
                <span aria-hidden>{meta.emoji}</span> {meta.label}{post.reactionCounts[reaction] > 0 ? ` ${post.reactionCounts[reaction]}` : ""}
              </button>
            );
          })}
          <button type="button" onClick={toggleComments} className="community-comment-trigger">
            <span aria-hidden>💬</span> {commentsOpen ? "Masquer" : post.commentCount > 0 ? `${post.commentCount} commentaire${post.commentCount > 1 ? "s" : ""}` : "Commenter"}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-red-600" role="status">{message}</p>}
      </div>

      {commentsOpen && (
        <div className="community-comments-panel border-t border-graphite-100 px-4 py-4 sm:px-5">
          {commentsLoading ? (
            <div className="space-y-2" aria-busy="true"><div className="h-12 animate-pulse rounded-xl bg-white" /><div className="h-12 animate-pulse rounded-xl bg-white" /></div>
          ) : comments?.length ? (
            <ul className="space-y-3">
              {comments.map((item) => (
                <li key={item.id} className="rounded-xl bg-white/90 p-3 ring-1 ring-graphite-100">
                  <div className="flex items-start justify-between gap-2">
                    <MemberIdentity member={item.author} avatarUrl={item.authorAvatarUrl} avatarSize={30} nameClassName="text-sm" meta={<time className="text-[11px] text-graphite-400" title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</time>} />
                    {item.canDelete && <button type="button" disabled={pending} onClick={() => removeComment(item.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-graphite-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer le commentaire">×</button>}
                  </div>
                  <p className="ml-[42px] mt-1 whitespace-pre-wrap text-sm leading-6 text-graphite-800">{item.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-white/90 px-3 py-3 text-sm text-graphite-500">Aucun commentaire pour le moment.</p>
          )}

          {canPublish && (
            <form onSubmit={submitComment} className="mt-4 flex gap-2">
              <label htmlFor={`community-comment-${post.id}`} className="sr-only">Ajouter un commentaire</label>
              <input id={`community-comment-${post.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={4000} disabled={pending} className="input min-w-0 flex-1 bg-white" placeholder="Écrire un commentaire…" />
              <button type="submit" className="btn-secondary shrink-0 px-3 sm:px-4" disabled={pending || !comment.trim()}>{pending ? "…" : "Envoyer"}</button>
            </form>
          )}
        </div>
      )}

      {lightboxIndex !== null && (
        <CommunityLightbox photos={lightboxPhotos} index={lightboxIndex} onIndexChange={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </article>
  );
}

function PostMedia({ photos, onOpen }: { photos: CommunityLightboxPhoto[]; onOpen: (index: number) => void }) {
  const visible = photos.slice(0, 4);
  const count = photos.length;
  const gridClass = count === 1 ? "grid-cols-1" : count === 3 ? "grid-cols-2 grid-rows-2" : "grid-cols-2";
  return (
    <div className={`grid ${gridClass} gap-1.5 px-4 pb-4 sm:gap-2 sm:px-5 sm:pb-5`}>
      {visible.map((photo, index) => {
        const isPrimaryThree = count === 3 && index === 0;
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpen(index)}
            className={`community-media-frame group relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 ${count === 1 ? "max-h-[min(40rem,70vh)]" : isPrimaryThree ? "row-span-2 h-full" : "aspect-square"}`}
            aria-label={`Agrandir la photo ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`Photo de la publication ${index + 1}`} className={`w-full transition duration-200 group-hover:scale-[1.015] ${count === 1 ? "h-auto max-h-[min(40rem,70vh)] object-contain" : "h-full object-cover"}`} loading="lazy" />
            {index === 3 && count > 4 && <span className="absolute inset-0 grid place-items-center bg-graphite-900/55 text-3xl font-semibold text-white">+{count - 4}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CommunityText({ content, className }: { content: string; className?: string }) {
  return (
    <p className={className}>
      {communityTextParts(content).map((part, index) => part.kind === "hashtag" ? (
        <Link key={`${part.value}-${index}`} href={`/app/community?q=${encodeURIComponent(part.value)}`} prefetch={false} className="font-semibold text-pool-700 hover:text-pool-800 hover:underline">
          {part.value}
        </Link>
      ) : <span key={`text-${index}`}>{part.value}</span>)}
    </p>
  );
}
