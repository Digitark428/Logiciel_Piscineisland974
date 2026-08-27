"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { loadMoreCommunityGallery } from "@/lib/actions/community";
import type { CommunityCursor, CommunityGalleryItem } from "@/lib/community-types";
import { formatDateTime } from "@/lib/utils/format";
import { CommunityLightbox, type CommunityLightboxPhoto } from "../CommunityLightbox";

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const visibleItems = items.filter((item): item is CommunityGalleryItem & { url: string } => Boolean(item.url));
  const lightboxPhotos: CommunityLightboxPhoto[] = visibleItems.map((item) => ({
    id: item.mediaId,
    url: item.url,
    content: item.content,
    createdAt: item.createdAt,
    author: item.author,
    authorAvatarUrl: item.authorAvatarUrl,
  }));

  const loadMore = () => {
    if (!cursor) return;
    setMessage(null);
    startLoading(async () => {
      const result = await loadMoreCommunityGallery(cursor, searchQuery);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setItems((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.mediaId === item.mediaId))]);
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
        {visibleItems.map((item, index) => (
          <button
            key={item.mediaId}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="community-gallery-tile group relative aspect-square overflow-hidden rounded-2xl bg-graphite-100 text-left ring-1 ring-graphite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-500"
            aria-label={`Ouvrir la photo publiée le ${formatDateTime(item.createdAt)}`}
          >
            <Image
              src={item.url}
              alt=""
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-[1.025]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-graphite-950/65 to-transparent px-3 pb-3 pt-10 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="block text-xs font-semibold">{item.author.first_name ?? item.author.email ?? "Membre"}</span>
              <time className="mt-0.5 block text-[11px] text-white/80">{formatDateTime(item.createdAt)}</time>
            </span>
          </button>
        ))}
      </div>
      {message && <p className="mt-4 text-center text-sm text-red-600" role="status">{message}</p>}
      {hasMore && cursor && (
        <div className="mt-7 flex justify-center">
          <button type="button" className="btn-secondary" onClick={loadMore} disabled={loading}>{loading ? "Chargement…" : "Voir plus de photos"}</button>
        </div>
      )}

      {selectedIndex !== null && (
        <CommunityLightbox
          photos={lightboxPhotos}
          index={selectedIndex}
          onIndexChange={setSelectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}
