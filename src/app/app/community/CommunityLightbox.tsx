"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { MemberIdentity } from "@/components/members/MemberIdentity";
import type { CommunityMember } from "@/lib/community-types";
import { formatDateTime } from "@/lib/utils/format";

export type CommunityLightboxPhoto = {
  id: string;
  url: string;
  content: string | null;
  createdAt: string;
  author: CommunityMember;
  authorAvatarUrl: string | null;
};

export function CommunityLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: CommunityLightboxPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const indexRef = useRef(index);
  const onCloseRef = useRef(onClose);
  const photo = photos[index];
  indexRef.current = index;
  onCloseRef.current = onClose;

  const previous = useCallback(() => {
    if (photos.length > 1) onIndexChange((indexRef.current - 1 + photos.length) % photos.length);
  }, [onIndexChange, photos.length]);
  const next = useCallback(() => {
    if (photos.length > 1) onIndexChange((indexRef.current + 1) % photos.length);
  }, [onIndexChange, photos.length]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const previousStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "Tab" && dialogRef.current) {
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
      }
    };
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousStyles.overflow;
      document.body.style.position = previousStyles.position;
      document.body.style.top = previousStyles.top;
      document.body.style.width = previousStyles.width;
      window.scrollTo({ top: scrollY, behavior: "auto" });
      activeElement?.focus();
    };
  }, [next, previous]);

  if (!mounted || !photo) return null;

  return createPortal(
    <div
      className="community-lightbox fixed inset-0 flex items-center justify-center bg-graphite-700/45 p-2 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo ${index + 1} sur ${photos.length}`}
        className="relative flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-[#edf2f3] shadow-float sm:h-[calc(100dvh-3rem)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-graphite-200 bg-white/95 text-xl text-graphite-700 shadow-card backdrop-blur transition hover:bg-pool-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500"
          onClick={onClose}
          aria-label="Fermer la photo"
        >
          ×
        </button>

        <div className="relative min-h-0 flex-1 bg-[#edf2f3]">
          <Image src={photo.url} alt="Photo partagée par l'équipe" fill sizes="100vw" className="object-contain p-2 sm:p-4" priority />
          {photos.length > 1 && (
            <>
              <button type="button" onClick={previous} className="community-lightbox-nav left-3" aria-label="Photo précédente">‹</button>
              <button type="button" onClick={next} className="community-lightbox-nav right-3" aria-label="Photo suivante">›</button>
            </>
          )}
        </div>

        <aside className="max-h-[36dvh] shrink-0 overflow-y-auto border-t border-graphite-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <MemberIdentity
            member={photo.author}
            avatarUrl={photo.authorAvatarUrl}
            avatarSize={38}
            variant="feed"
            roleTone={photo.author.role === "admin" ? "coral" : "aqua"}
            meta={<time className="text-xs text-graphite-500">{formatDateTime(photo.createdAt)}</time>}
          />
          {photo.content && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-graphite-800">{photo.content}</p>}
          {photos.length > 1 && <p className="mt-2 text-xs text-graphite-400">{index + 1} / {photos.length}</p>}
        </aside>
      </section>
    </div>,
    document.body,
  );
}
