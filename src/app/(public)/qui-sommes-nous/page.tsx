import type { Metadata } from "next";
import { PublicPageHeading } from "@/components/public/PublicPage";

export const metadata: Metadata = {
  title: "Qui sommes-nous ? — LETI",
  description:
    "Découvrez la vision de LETI, un logiciel professionnel pensé pour simplifier le quotidien des piscinistes.",
  alternates: {
    canonical: "/qui-sommes-nous",
  },
};

export default function AboutPage() {
  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <PublicPageHeading
        eyebrow="Qui sommes-nous ?"
        title="Un outil pensé pour le terrain."
        description="LETI grandit avec une conviction : la technologie doit simplifier le métier, jamais l’alourdir."
      />

      <section className="mx-auto mt-16 grid max-w-6xl items-center gap-10 sm:mt-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <div className="flex aspect-[4/5] min-h-[25rem] items-center justify-center rounded-[2rem] border border-dashed border-pool-300/80 bg-white p-8 shadow-[0_12px_36px_rgba(24,58,89,0.045)]">
          <div className="text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-pool-100 bg-pool-50 text-pool-700">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-9 w-9">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M4.5 21c.5-5 3-7 7.5-7s7 2 7.5 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p className="mt-5 text-sm font-semibold text-graphite-700">
              Photo du fondateur / gérant
            </p>
            <p className="mt-1 text-xs text-graphite-400">À ajouter</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="text-xl font-semibold leading-8 tracking-[-0.025em] text-graphite-900 sm:text-2xl sm:leading-9">
            LETI est né d’une idée simple : les outils professionnels destinés aux piscinistes ne devraient pas compliquer leur métier.
          </p>
          <div className="mt-7 space-y-5 text-base leading-8 text-graphite-500 sm:text-lg">
            <p>
              Nous développons une solution pensée pour le terrain, permettant de centraliser les clients, les entretiens, le planning, l’équipe et l’organisation quotidienne dans une interface simple et intuitive.
            </p>
            <p>
              LETI évolue avec les besoins des professionnels afin de devenir progressivement un véritable outil de pilotage de leur activité.
            </p>
          </div>
          <span aria-hidden className="mt-9 block h-px w-20 bg-coral-400" />
        </div>
      </section>
    </div>
  );
}
