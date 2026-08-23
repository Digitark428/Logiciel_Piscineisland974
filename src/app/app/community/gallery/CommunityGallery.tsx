"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import { loadMoreCommunityGallery } from "@/lib/actions/community";
import type { CommunityCursor, CommunityGalleryItem } from "@/lib/community-types";
import { formatDateTime } from "@/lib/utils/format";

export function CommunityGallery({
  initialItems,
  initialHasMore,
  initialCursor,
  searchQuery,
}: {
  initialItems: CommunityGalleryItem[];
  initialHasMore: boolean;
  initialCursor: CommunityCursor | null;
  searchQuery: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [selected, setSelected] = useState<CommunityGalleryItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const closeLightbox = useCallback(() => {
    setSelected(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeLightbox, selected]);

  const loadMore = () => {
    if (!cursor) return;
    setMessage(null);
    startLoading(async () => {
      const result = await loadMoreCommunityGallery(cursor, searchQuery);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setItems((current) => [...current, ...result.items]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    });
  };

  if (items.length === 0) {
    return (
      <div className="card px-6 py-14 text-center">
        <div className="text-3xl">▧</div>
        <h2 className="mt-3 text-base font-semibold text-graphite-900">{searchQuery ? "Aucune photo trouvée" : "La galerie est encore vide"}</h2>
        <p className="mt-1 text-sm text-graphite-500">{searchQuery ? `Aucune photo ne correspond à « ${searchQuery} ».` : "Les photos ajoutées dans Entre nous apparaîtront ici."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => item.url ? (
          <button
            key={item.mediaId}
            type="button"
            onClick={() => {
              openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
              setSelected(item);
            }}
            className="group relative aspect-square overflow-hidden rounded-xl bg-graphite-100 text-left ring-1 ring-graphite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-500"
            aria-label={`Ouvrir la photo publiée le ${formatDateTime(item.createdAt)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-graphite-950/70 to-transparent px-2 pb-2 pt-8 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {item.author.first_name ?? item.author.email ?? "Membre"}
            </span>
          </button>
        ) : null)}
      </div>
      {message && <p className="mt-4 text-center text-sm text-red-600" role="status">{message}</p>}
      {hasMore && cursor && (
        <div className="mt-6 flex justify-center">
          <button type="button" className="btn-secondary" onClick={loadMore} disabled={loading}>{loading ? "Chargement…" : "Voir plus"}</button>
        </div>
      )}

      {selected?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/85 p-3 sm:p-6" onMouseDown={closeLightbox}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Détail de la photo"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-float lg:flex-row"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-0 flex-1 items-center justify-center bg-graphite-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.url} alt="Photo partagée par l'équipe" className="max-h-[68dvh] max-w-full object-contain lg:max-h-[calc(100dvh-3rem)]" />
            </div>
            <aside className="w-full shrink-0 overflow-y-auto p-4 sm:p-5 lg:w-80">
              <div className="flex items-start justify-between gap-3">
                <MemberIdentity member={selected.author} avatarUrl={selected.authorAvatarUrl} avatarSize={38} />
                <button ref={closeButtonRef} type="button" className="btn-ghost -mr-2 -mt-2 min-h-11 min-w-11 p-2" onClick={closeLightbox} aria-label="Fermer">✕</button>
              </div>
              <time className="mt-3 block text-xs text-graphite-400">{formatDateTime(selected.createdAt)}</time>
              {selected.content && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-graphite-700">{selected.content}</p>}
            </aside>
          </section>
        </div>
      )}
    </>
  );
}
