"use client";

import { useEffect, useState } from "react";

interface ExternalOverlayState {
  hidden: boolean;
  shifted: boolean;
  drawerWidth: string | null;
}

const CLEAR_STATE: ExternalOverlayState = { hidden: false, shifted: false, drawerWidth: null };

function sameState(left: ExternalOverlayState, right: ExternalOverlayState) {
  return left.hidden === right.hidden && left.shifted === right.shifted && left.drawerWidth === right.drawerWidth;
}

/**
 * Coordonne l’action flottante globale avec les interfaces qui couvrent le
 * contenu. Les overlays déclarent uniquement leur nature via data-attributes ;
 * aucun composant métier ne dépend directement du widget d’assistance.
 */
export function useExternalOverlayState(): ExternalOverlayState {
  const [state, setState] = useState<ExternalOverlayState>(CLEAR_STATE);

  useEffect(() => {
    const update = () => {
      const overlays = Array.from(document.querySelectorAll<HTMLElement>(
        '[data-leti-overlay]:not([data-leti-overlay-owner="support"])',
      )).filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
      const blocking = overlays.some((element) => (
        element.dataset.letiOverlay !== "drawer" || element.dataset.letiOverlaySide !== "right"
      ));
      let rightDrawer: HTMLElement | undefined;
      for (let index = overlays.length - 1; index >= 0; index -= 1) {
        const element = overlays[index];
        if (element.dataset.letiOverlay === "drawer" && element.dataset.letiOverlaySide === "right") {
          rightDrawer = element;
          break;
        }
      }
      const next: ExternalOverlayState = blocking
        ? { hidden: true, shifted: false, drawerWidth: null }
        : rightDrawer
          ? {
              hidden: window.innerWidth < 768,
              shifted: window.innerWidth >= 768,
              drawerWidth: `${Math.ceil(rightDrawer.getBoundingClientRect().width)}px`,
            }
          : CLEAR_STATE;
      setState((current) => sameState(current, next) ? current : next);
    };

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-leti-overlay", "open"] });
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return state;
}
