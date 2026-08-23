"use client";

import { useRef, useState } from "react";
import { formatMoneyCents } from "@/lib/utils/money";

interface FinancialCarouselProps {
  recurringCents: number;
  oneOffCents: number;
}

export function FinancialCarousel({ recurringCents, oneOffCents }: FinancialCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const totalCents = recurringCents + oneOffCents;

  const slides = [
    {
      title: "Mes entretiens",
      value: formatMoneyCents(recurringCents),
      suffix: "par mois",
      detail: "Revenus mensuels récurrents",
    },
    {
      title: "Entretiens ponctuels",
      value: formatMoneyCents(oneOffCents),
      suffix: "ce mois-ci",
      detail: "Chiffre d’affaires estimé",
    },
    {
      title: "Total",
      value: formatMoneyCents(totalCents),
      suffix: "ce mois-ci",
      detail: "Chiffre d’affaires estimé",
    },
    {
      title: "Mes frais",
      value: "En développement",
      suffix: "",
      detail: "Bientôt : coûts et dépenses de l’entreprise",
      future: true,
    },
  ];

  const goTo = (index: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
    viewport.children.item(nextIndex)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActiveIndex(nextIndex);
  };

  return (
    <section className="card relative overflow-hidden" aria-label="Aperçu financier">
      <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pool-700">Aperçu financier</p>
          <p className="mt-1 text-sm text-graphite-500">Vos revenus estimés du mois</p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} className="btn-ghost h-9 w-9 p-0" aria-label="Carte financière précédente">←</button>
          <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === slides.length - 1} className="btn-ghost h-9 w-9 p-0" aria-label="Carte financière suivante">→</button>
        </div>
      </div>

      <div
        ref={viewportRef}
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;
          if (width) setActiveIndex(Math.round(event.currentTarget.scrollLeft / width));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <article key={slide.title} className="min-w-full snap-start px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className={`rounded-2xl px-5 py-6 sm:px-7 sm:py-8 ${slide.future ? "bg-graphite-50" : "bg-pool-50"}`}>
              <h2 className="text-base font-semibold text-graphite-900">{slide.title}</h2>
              <p className={`mt-3 break-words font-bold tracking-tight text-graphite-900 ${slide.future ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl"}`}>
                {slide.value}
              </p>
              {slide.suffix && <p className="mt-1 text-sm font-medium text-pool-700">{slide.suffix}</p>}
              <p className="mt-4 text-sm text-graphite-500">{slide.detail}</p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2" aria-label={`Carte ${index + 1} sur ${slides.length}`}>
              {slides.map((item, dotIndex) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => goTo(dotIndex)}
                  className={`h-2 rounded-full transition-all ${dotIndex === activeIndex ? "w-5 bg-pool-600" : "w-2 bg-graphite-200 hover:bg-graphite-300"}`}
                  aria-label={`Afficher ${item.title}`}
                  aria-current={dotIndex === activeIndex ? "true" : undefined}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
