import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageHeading } from "@/components/public/PublicPage";

export const metadata: Metadata = {
  title: "Tarifs — LETI",
  description:
    "Découvrez les offres LETI pour organiser l’entretien, le planning, les clients et l’équipe de votre entreprise.",
  alternates: {
    canonical: "/tarifs",
  },
};

const MAINTENANCE_FEATURES = [
  "Gestion des clients et fiches clients",
  "Entretiens ponctuels et récurrents",
  "Planning et vision semaine",
  "Tâches, to-do list et notes",
  "Notes d’équipe et Entre nous",
  "Carte et organisation de l’équipe",
  "Documents et notifications",
  "Journal d’activité",
  "Sauvegardes, historique et sauvegarde manuelle",
  "Outils d’organisation actuels",
] as const;

const OFFERS = [
  {
    name: "LETI Entretien",
    price: "49 €",
    cadence: "/ mois",
    description:
      "Toutes les fonctions principales de LETI pour gérer les entretiens et organiser votre activité quotidienne.",
    status: "Disponible",
    available: true,
    features: MAINTENANCE_FEATURES,
  },
  {
    name: "LETI Plus",
    price: "89 €",
    cadence: "/ mois",
    description:
      "Tout LETI Entretien, enrichi du module métier qui correspond le mieux à votre activité.",
    status: "En développement",
    available: false,
    features: [
      "Tout LETI Entretien",
      "Mes Chantiers ou Mes Dépannages, au choix",
    ],
  },
  {
    name: "LETI Complet",
    price: "149 €",
    cadence: "/ mois",
    description:
      "L’ensemble de l’écosystème LETI pour piloter progressivement toutes les dimensions de votre activité.",
    status: "En développement",
    available: false,
    features: [
      "LETI Entretien",
      "Mes Chantiers",
      "Mes Dépannages",
      "Futurs modules complémentaires prévus dans LETI",
    ],
  },
] as const;

export default function PricingPage() {
  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <PublicPageHeading
        eyebrow="Tarifs"
        title="Des offres simples à lire."
        description="Commencez avec LETI Entretien. Les offres enrichies restent visibles pour présenter la suite, sans abonnement actif tant que leurs modules sont en développement."
      />

      <div className="mx-auto mt-16 max-w-7xl space-y-5 sm:mt-20">
        {OFFERS.map((offer) => (
          <article
            key={offer.name}
            className={`card grid gap-8 p-6 sm:p-8 xl:grid-cols-[14rem_minmax(0,1fr)_13rem] xl:items-center xl:gap-10 ${
              offer.name === "LETI Plus" ? "border-pool-200" : ""
            }`}
          >
            <div>
              <span
                className={`badge ${
                  offer.available
                    ? "border-pool-200 bg-pool-50 text-pool-800"
                    : "leti-development-badge uppercase tracking-[0.06em]"
                }`}
              >
                {offer.status}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-graphite-900">
                {offer.name}
              </h2>
              <p className="mt-3 flex items-baseline gap-1 text-graphite-900">
                <span className="text-4xl font-semibold tracking-[-0.05em]">
                  {offer.price}
                </span>
                <span className="text-sm text-graphite-400">{offer.cadence}</span>
              </p>
            </div>

            <div>
              <p className="max-w-3xl text-base leading-7 text-graphite-500">
                {offer.description}
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-graphite-700">
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      fill="none"
                      className="mt-1 h-4 w-4 shrink-0 text-pool-700"
                    >
                      <path
                        d="m4 10 3.5 3.5L16 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="xl:text-right">
              {offer.available ? (
                <Link href="/signup" className="btn-primary w-full whitespace-nowrap xl:w-auto">
                  Tenter l’expérience
                </Link>
              ) : (
                <button type="button" className="btn-secondary w-full whitespace-nowrap xl:w-auto" disabled>
                  Bientôt disponible
                </button>
              )}
            </div>
          </article>
        ))}

        <article className="grid gap-7 rounded-2xl border border-pool-200/80 bg-pool-50/45 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.035em] text-graphite-900">
                LETI IA
              </h2>
              <span className="leti-development-badge leti-development-badge--aqua badge uppercase tracking-[0.06em]">
                En développement
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-base leading-7 text-graphite-500">
              Un futur module complémentaire conçu pour assister progressivement les professionnels dans l’utilisation de LETI.
            </p>
          </div>
          <div className="lg:text-right">
            <p className="text-lg font-semibold text-graphite-800">Tarif à venir</p>
            <button type="button" className="btn-secondary mt-3 w-full lg:w-auto" disabled>
              Bientôt disponible
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
