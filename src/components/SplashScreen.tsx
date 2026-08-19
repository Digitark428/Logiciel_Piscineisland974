"use client";

import { useEffect, useState } from "react";

/**
 * Couche de marque uniquement : les enfants du layout restent rendus et les
 * redirections/session ne sont donc jamais bloquées par le splash.
 */
export function SplashScreen() {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      const timeout = window.setTimeout(() => setMounted(false), 80);
      return () => window.clearTimeout(timeout);
    }

    // Laisse au sigle puis au mot-symbole le temps d'apparaître avant un
    // fondu doux. La page sous-jacente reste rendue et utilisable pendant ce
    // temps (le splash ne capte jamais les interactions).
    const leaveTimeout = window.setTimeout(() => setLeaving(true), 1_450);
    const removeTimeout = window.setTimeout(() => setMounted(false), 1_950);
    return () => {
      window.clearTimeout(leaveTimeout);
      window.clearTimeout(removeTimeout);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`leti-splash ${leaving ? "leti-splash-leaving" : ""} pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-graphite-50`}
      aria-hidden="true"
    >
      <div className="leti-splash-content flex flex-col items-center">
        <img src="/leti/leti-symbol-transparent.png" alt="" className="leti-splash-symbol h-28 w-28 object-contain sm:h-32 sm:w-32" />
        <img src="/leti/leti-wordmark-transparent.png" alt="" className="leti-splash-wordmark mt-1 h-16 w-36 object-contain sm:h-[4.5rem] sm:w-40" />
      </div>
    </div>
  );
}
