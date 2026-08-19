"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const AppSupportWidget = dynamic(
  () => import("./AppSupportWidget").then((module) => module.AppSupportWidget),
  {
    ssr: false,
    loading: () => <SupportLoadingPanel />,
  },
);

/**
 * L'assistance contient les actions serveur et l'historique des conversations.
 * Le launcher reste donc très léger dans le bundle commun de /app, tandis que
 * le volet complet est demandé seulement quand l'utilisateur en a besoin.
 */
export function DeferredAppSupportWidget() {
  const [requested, setRequested] = useState(false);

  if (requested) return <AppSupportWidget initiallyOpen />;

  return (
    <button
      type="button"
      onClick={() => setRequested(true)}
      onPointerEnter={preloadSupportWidget}
      onFocus={preloadSupportWidget}
      onTouchStart={preloadSupportWidget}
      aria-label="Ouvrir l'aide et les retours"
      aria-haspopup="dialog"
      className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-pool-600/90 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pool-600/20 backdrop-blur transition hover:bg-pool-700 active:scale-95"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <span aria-hidden="true" className="text-base leading-none">💬</span>
      <span className="hidden sm:inline">Aide & retours</span>
    </button>
  );
}

function preloadSupportWidget() {
  if (typeof window !== "undefined") void import("./AppSupportWidget");
}

function SupportLoadingPanel() {
  return (
    <section
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex w-auto max-w-sm items-center gap-3 rounded-2xl border border-graphite-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[370px]"
      role="dialog"
      tabIndex={-1}
      autoFocus
      aria-label="Ouverture de l'aide et des retours"
      aria-busy="true"
      aria-live="polite"
    >
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-pool-200 border-t-pool-600" />
      <span className="text-sm font-medium text-graphite-700">Ouverture de l’aide…</span>
    </section>
  );
}
