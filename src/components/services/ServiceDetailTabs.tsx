"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ServiceDetailTabId = "intervention" | "tracking" | "details";

const TABS: Array<{ id: ServiceDetailTabId; label: string }> = [
  { id: "intervention", label: "Intervention" },
  { id: "tracking", label: "Suivi & contrat" },
  { id: "details", label: "Détails" },
];

export function ServiceDetailTabs({
  intervention,
  tracking,
  details,
}: {
  intervention: React.ReactNode;
  tracking: React.ReactNode;
  details: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<ServiceDetailTabId>("intervention");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panels: Record<ServiceDetailTabId, React.ReactNode> = { intervention, tracking, details };

  return (
    <div className="card overflow-hidden">
      <div
        role="tablist"
        aria-label="Contenu de la fiche d'entretien"
        className="flex overflow-x-auto border-b border-graphite-100 bg-graphite-50/60 px-2 sm:px-5"
      >
        {TABS.map((tab, index) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              id={`service-detail-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`service-detail-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const nextIndex = (index + direction + TABS.length) % TABS.length;
                const nextTab = TABS[nextIndex];
                setActiveTab(nextTab.id);
                tabRefs.current[nextIndex]?.focus();
              }}
              className={cn(
                "relative min-h-12 shrink-0 px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pool-500 sm:px-5",
                selected ? "text-graphite-900" : "text-graphite-500 hover:text-graphite-800",
              )}
            >
              {tab.label}
              {selected && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-pool-500 sm:inset-x-5" />}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`service-detail-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`service-detail-tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="p-5 sm:p-7"
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
