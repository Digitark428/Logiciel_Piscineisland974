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
    <section
      className="relative overflow-hidden rounded-[1.6rem] border border-pool-100/80 bg-gradient-to-br from-white via-pool-50/60 to-pool-100/35 shadow-[0_1px_2px_rgba(24,58,89,0.02),0_14px_38px_rgba(24,58,89,0.035)]"
      aria-label="Aperçu financier"
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5 sm:px-8 sm:pt-7">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.025em] text-graphite-900">Finances</h2>
          <p className="mt-1 text-sm text-graphite-500">Vos revenus estimés du mois</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/65 text-graphite-700 shadow-[0_1px_2px_rgba(24,58,89,0.04)] transition hover:border-pool-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Carte financière précédente"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === slides.length - 1}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/65 text-graphite-700 shadow-[0_1px_2px_rgba(24,58,89,0.04)] transition hover:border-pool-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Carte financière suivante"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
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
        {slides.map((slide) => (
          <article key={slide.title} className="flex min-h-[15.5rem] min-w-full snap-start flex-col justify-center px-5 py-8 sm:min-h-[17rem] sm:px-8 sm:py-10">
            <div className="max-w-3xl">
              <h3 className="text-sm font-medium text-pool-800">{slide.title}</h3>
              <p className={`mt-4 break-words font-semibold leading-none tracking-[-0.05em] text-graphite-900 ${slide.future ? "text-[2rem] sm:text-[2.6rem]" : "text-[3rem] sm:text-[3.5rem]"}`}>
                {slide.value}
              </p>
              {slide.suffix && <p className="mt-3 text-sm font-medium text-pool-800">{slide.suffix}</p>}
              <p className="mt-5 text-sm leading-6 text-graphite-500">{slide.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/70 px-5 py-4 sm:px-8">
        <p className="text-xs font-medium text-graphite-400">{activeIndex + 1} / {slides.length}</p>
        <div className="flex items-center gap-2" aria-label={`Carte ${activeIndex + 1} sur ${slides.length}`}>
          {slides.map((item, dotIndex) => (
            <button
              key={item.title}
              type="button"
              onClick={() => goTo(dotIndex)}
              className={`h-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 ${dotIndex === activeIndex ? "w-7 bg-pool-600" : "w-2.5 bg-graphite-200 hover:bg-graphite-300"}`}
              aria-label={`Afficher ${item.title}`}
              aria-current={dotIndex === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
