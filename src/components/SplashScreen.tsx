"use client";

import { useEffect, useState } from "react";

/**
 * Couche de marque uniquement : les enfants du layout restent rendus et les
 * redirections/session ne sont donc jamais bloquées par le splash.
 */
export function SplashScreen() {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setMounted(false), reducedMotion ? 80 : 1060);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!mounted) return null;

  return (
    <div className="leti-splash pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-white" aria-hidden="true">
      <div className="flex flex-col items-center">
        <img src="/leti/leti-symbol-official.png" alt="" className="leti-splash-symbol h-28 w-28 object-contain sm:h-32 sm:w-32" />
        <img src="/leti/leti-wordmark-official.png" alt="" className="leti-splash-wordmark -mt-4 h-16 w-36 object-contain sm:h-[4.5rem] sm:w-40" />
      </div>
    </div>
  );
}
