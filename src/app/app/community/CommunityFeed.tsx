"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import {
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  loadMoreCommunityPosts,
  toggleCommunityReaction,
} from "@/lib/actions/community";
import {
  COMMUNITY_REACTIONS,
  type CommunityCommentItem,
  type CommunityFeedItem,
  type CommunityReactionKind,
} from "@/lib/community-types";
import { formatDateTime, formatRelative } from "@/lib/utils/format";

const REACTION_LABELS: Record<CommunityReactionKind, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "J'aime" },
  love: { emoji: "❤️", label: "J'adore" },
  laugh: { emoji: "😂", label: "Mort de rire" },
};

const OUTPUT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SOURCE_IMAGE_TYPES = new Set(["image/avif", "image/gif", "image/heic", "image/heif", "image/jpeg", "image/png", "image/webp"]);

function isImageSource(file: File): boolean {
  return SOURCE_IMAGE_TYPES.has(file.type.toLowerCase()) || /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

function imageExtension(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function CommunityFeed({
  initialItems,
  initialHasMore,
  canPublish,
}: {
  initialItems: CommunityFeedItem[];
  initialHasMore: boolean;
  canPublish: boolean;
}) {
  const [posts, setPosts] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, startLoadMore] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const loadMore = () => {
    const last = posts.at(-1);
    if (!last) return;
    setMessage(null);
    startLoadMore(async () => {
      const result = await loadMoreCommunityPosts({ createdAt: last.createdAt, id: last.id });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setPosts((current) => [...current, ...result.items]);
      setHasMore(result.hasMore);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PostComposer canPublish={canPublish} />
      {posts.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <div className="text-3xl">💬</div>
          <h2 className="mt-3 text-base font-semibold text-graphite-900">La vie de l'équipe commence ici</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-graphite-500">Partagez une photo de chantier, une bonne nouvelle ou un petit mot avec votre équipe.</p>
        </div>
      ) : (
        posts.map((post) => <CommunityPostCard key={post.id} post={post} canPublish={canPublish} onReaction={setPosts} />)
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

function PostComposer({ canPublish }: { canPublish: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

  const pickImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    const imageFiles = picked.filter(isImageSource);
    const next = imageFiles.slice(0, 4);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setFiles(next);
    setPreviewUrls(next.map((file) => URL.createObjectURL(file)));
    if (imageFiles.length !== picked.length) setMessage("Seuls les fichiers image peuvent être ajoutés.");
    else if (imageFiles.length > 4) setMessage("Seules les 4 premières photos ont été retenues.");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() && files.length === 0) return;
    setMessage(null);
    start(async () => {
      try {
        const optimized = await Promise.all(files.map(optimizeImage));
        const formData = new FormData();
        formData.set("content", content);
        optimized.forEach((file) => formData.append("images", file));
        const result = await createCommunityPost(formData);
        if (!result?.ok) {
          setMessage(result?.message ?? "La publication n'a pas abouti. Réessayez dans quelques instants.");
          return;
        }
        setContent("");
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        setFiles([]);
        setPreviewUrls([]);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Impossible de préparer les photos.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="card p-4 sm:p-5">
      <label htmlFor="community-content" className="sr-only">Votre publication</label>
      <textarea
        id="community-content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={!canPublish || pending}
        rows={3}
        maxLength={2000}
        className="input resize-none border-0 bg-graphite-50 focus:ring-1"
        placeholder={canPublish ? "Partagez un moment avec l'équipe…" : "La publication est réservée aux membres autorisés."}
      />
      {previewUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {previewUrls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={`Photo sélectionnée ${index + 1}`} className="aspect-square w-full rounded-xl object-cover ring-1 ring-graphite-100" />
          ))}
        </div>
      )}
      {message && <p className="mt-2 text-sm text-red-600" role="status">{message}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-graphite-100 pt-3">
        <label className={`inline-flex cursor-pointer items-center gap-2 text-sm font-medium ${canPublish ? "text-pool-700 hover:text-pool-800" : "text-graphite-400"}`}>
          <span aria-hidden>▧</span> Ajouter des photos
          <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" disabled={!canPublish || pending} onChange={pickImages} />
        </label>
        {canPublish && (
          <button type="submit" className="btn-primary" disabled={pending || (!content.trim() && files.length === 0)}>
            {pending ? "Publication…" : "Publier"}
          </button>
        )}
      </div>
    </form>
  );
}

function CommunityPostCard({
  post,
  canPublish,
  onReaction,
}: {
  post: CommunityFeedItem;
  canPublish: boolean;
  onReaction: React.Dispatch<React.SetStateAction<CommunityFeedItem[]>>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [comments, setComments] = useState<CommunityCommentItem[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const loadComments = async () => {
    setCommentsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/community/${post.id}`, { cache: "no-store" });
      const body = await response.json() as { comments?: CommunityCommentItem[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Impossible de charger les commentaires.");
      setComments(body.comments ?? []);
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

  const react = (reaction: CommunityReactionKind) => {
    if (!canPublish) return;
    setMessage(null);
    start(async () => {
      const result = await toggleCommunityReaction(post.id, reaction);
      if (!result.ok || result.active === undefined) {
        setMessage(result.message ?? "Réaction impossible.");
        return;
      }
      onReaction((current) => current.map((item) => {
        if (item.id !== post.id) return item;
        const hasReaction = item.currentReactions.includes(reaction);
        const currentReactions = result.active
          ? Array.from(new Set([...item.currentReactions, reaction]))
          : item.currentReactions.filter((value) => value !== reaction);
        return {
          ...item,
          currentReactions,
          reactionCounts: {
            ...item.reactionCounts,
            [reaction]: Math.max(0, item.reactionCounts[reaction] + (result.active && !hasReaction ? 1 : !result.active && hasReaction ? -1 : 0)),
          },
        };
      }));
    });
  };

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = comment.trim();
    if (!content) return;
    setMessage(null);
    start(async () => {
      const result = await createCommunityComment(post.id, content);
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
    <article className="card overflow-hidden p-0">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <MemberIdentity member={post.author} avatarUrl={post.authorAvatarUrl} avatarSize={42} />
          <div className="flex items-start gap-2">
            <time className="pt-1 text-right text-xs text-graphite-400" title={formatDateTime(post.createdAt)}>{formatRelative(post.createdAt)}</time>
            {post.canDelete && (
              <button type="button" disabled={pending} onClick={remove} className="btn-ghost -mr-2 -mt-1 p-2 text-graphite-400 hover:text-red-500" aria-label="Supprimer la publication">✕</button>
            )}
          </div>
        </div>
        {post.content && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-graphite-800">{post.content}</p>}
      </div>

      {post.media.length > 0 && (
        <div className={`grid gap-0.5 bg-graphite-100 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.media.map((media, index) => media.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={media.id} src={media.url} alt={`Photo de la publication ${index + 1}`} className={`w-full object-cover ${post.media.length === 1 ? "max-h-[32rem]" : "aspect-square"}`} />
          ) : null)}
        </div>
      )}

      <div className="border-t border-graphite-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
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
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${active ? "bg-pool-50 text-pool-800 ring-1 ring-pool-200" : "bg-graphite-50 text-graphite-600 hover:bg-graphite-100"}`}
              >
                {meta.emoji} {meta.label}{post.reactionCounts[reaction] > 0 ? ` ${post.reactionCounts[reaction]}` : ""}
              </button>
            );
          })}
          <button type="button" onClick={toggleComments} className="px-2 text-xs font-medium text-pool-700 hover:text-pool-800">
            {commentsOpen ? "Masquer les commentaires" : post.commentCount > 0 ? `${post.commentCount} commentaire${post.commentCount > 1 ? "s" : ""}` : "Commenter"}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-red-600" role="status">{message}</p>}
      </div>

      {commentsOpen && (
        <div className="border-t border-graphite-100 bg-graphite-50 px-4 py-4 sm:px-5">
          {commentsLoading ? (
            <div className="space-y-2" aria-busy="true"><div className="h-12 animate-pulse rounded-xl bg-white" /><div className="h-12 animate-pulse rounded-xl bg-white" /></div>
          ) : comments?.length ? (
            <ul className="space-y-3">
              {comments.map((item) => (
                <li key={item.id} className="rounded-xl bg-white p-3 ring-1 ring-graphite-100">
                  <div className="flex items-start justify-between gap-2">
                    <MemberIdentity member={item.author} avatarUrl={item.authorAvatarUrl} avatarSize={30} nameClassName="text-sm" />
                    {item.canDelete && <button type="button" disabled={pending} onClick={() => removeComment(item.id)} className="btn-ghost -mr-1 -mt-1 p-1.5 text-graphite-400 hover:text-red-500" aria-label="Supprimer le commentaire">✕</button>}
                  </div>
                  <time className="ml-[42px] block text-[11px] text-graphite-400" title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</time>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-graphite-800">{item.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-white px-3 py-3 text-sm text-graphite-500">Aucun commentaire pour le moment.</p>
          )}

          {canPublish && (
            <form onSubmit={submitComment} className="mt-4 flex gap-2">
              <label htmlFor={`community-comment-${post.id}`} className="sr-only">Ajouter un commentaire</label>
              <input id={`community-comment-${post.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={4000} disabled={pending} className="input min-w-0 flex-1 bg-white" placeholder="Écrire un commentaire…" />
              <button type="submit" className="btn-primary shrink-0" disabled={pending || !comment.trim()}>{pending ? "…" : "Envoyer"}</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

async function optimizeImage(file: File): Promise<File> {
  if (!isImageSource(file)) throw new Error("Sélectionnez un fichier image.");
  const image = await decodeImage(file);
  const largestSide = Math.max(image.width, image.height);
  const ratio = Math.min(1, 2048 / largestSide);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Votre navigateur ne peut pas optimiser cette photo.");
  try {
    image.draw(context, width, height);
  } finally {
    image.close();
  }
  const blob = await compressedCanvasBlob(canvas);
  if (blob.size > 5 * 1024 * 1024) throw new Error("Une photo reste trop volumineuse après optimisation.");
  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.${imageExtension(blob.type)}`, { type: blob.type });
}

type DecodedImage = {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
};

/** Safari ne prend pas toujours createImageBitmap en charge pour les photos HEIC. */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      };
    } catch {
      // Le repli Image est nécessaire pour certains appareils Apple.
    }
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("Cette photo ne peut pas être lue. Exportez-la en JPEG si le problème persiste."));
      candidate.src = sourceUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
      close: () => URL.revokeObjectURL(sourceUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    throw error;
  }
}

async function compressedCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob("image/webp", 0.84);
  if (webp && OUTPUT_IMAGE_TYPES.has(webp.type)) return webp;
  const jpeg = await toBlob("image/jpeg", 0.86);
  if (jpeg && OUTPUT_IMAGE_TYPES.has(jpeg.type)) return jpeg;
  throw new Error("Impossible d'optimiser cette photo.");
}
