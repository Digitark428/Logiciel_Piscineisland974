"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
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
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const closeLightbox = useCallback(() => {
    setSelected(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo({ top: scrollY, behavior: "auto" });
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
            <Image
              src={item.url}
              alt=""
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
              className="object-cover transition duration-200 group-hover:scale-[1.03]"
            />
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-graphite-950/94 p-2 backdrop-blur-sm sm:p-6" onMouseDown={closeLightbox}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Détail de la photo"
            className="relative flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-graphite-950 shadow-float sm:h-[calc(100dvh-3rem)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-graphite-950/75 text-xl text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-graphite-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-300"
              onClick={closeLightbox}
              aria-label="Fermer la photo"
            >
              ✕
            </button>
            <div className="relative min-h-0 flex-1 bg-black">
              <Image
                src={selected.url}
                alt="Photo partagée par l'équipe"
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <aside className="max-h-[34dvh] shrink-0 overflow-y-auto border-t border-white/10 bg-graphite-950 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white sm:px-5 sm:py-4">
              <MemberIdentity
                member={selected.author}
                avatarUrl={selected.authorAvatarUrl}
                avatarSize={36}
                nameClassName="text-sm text-white"
                meta={<time className="text-graphite-300">{formatDateTime(selected.createdAt)}</time>}
              />
              {selected.content && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-graphite-100">{selected.content}</p>}
            </aside>
          </section>
        </div>
      )}
    </>
  );
}
