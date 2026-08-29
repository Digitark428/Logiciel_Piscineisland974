"use client";

import { useEffect } from "react";

async function waitForPrintAssets(): Promise<void> {
  if ("fonts" in document) await document.fonts.ready;
  const pendingImages = Array.from(document.images)
    .filter((image) => !image.complete)
    .map((image) => new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    }));
  await Promise.all(pendingImages);
}

export function PrintControls() {
  useEffect(() => {
    let cancelled = false;
    void waitForPrintAssets().then(() => {
      if (cancelled) return;
      window.setTimeout(() => window.print(), 120);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="leti-week-print-controls no-print">
      <button type="button" onClick={() => window.print()}>Imprimer</button>
      <button type="button" onClick={() => window.close()}>Fermer</button>
    </div>
  );
}
