import type { Metadata } from "next";
import { Icon } from "@/components/app/icons";
import {
  PublicPageHeading,
  ScreenshotPlaceholder,
} from "@/components/public/PublicPage";

export const metadata: Metadata = {
  title: "Nos fonctionnalités — LETI",
  description:
    "Découvrez les fonctionnalités déjà présentes dans LETI pour gérer les clients, les entretiens, le planning et l’organisation quotidienne.",
  alternates: {
    canonical: "/fonctionnalites",
  },
};

const FEATURE_GROUPS = [
  {
    icon: "home",
    title: "Tableau de bord",
    description:
      "Gardez une vue claire sur l’activité du jour, les prochains entretiens et les informations qui demandent votre attention.",
    features: ["Tableau de bord"],
  },
  {
    icon: "users",
    title: "Clients",
    description:
      "Centralisez les coordonnées et les informations utiles de chaque client dans une fiche simple à consulter par l’équipe.",
    features: ["Mes clients", "Fiches clients"],
  },
  {
    icon: "wrench",
    title: "Entretiens",
    description:
      "Préparez et suivez les passages ponctuels comme les contrats d’entretien récurrents, sans disperser les informations.",
    features: [
      "Mes entretiens",
      "Entretiens ponctuels",
      "Entretiens récurrents",
    ],
  },
  {
    icon: "calendar",
    title: "Planning",
    description:
      "Organisez les passages et les événements dans une vue adaptée à la semaine, puis retrouvez les interventions du jour sur la carte.",
    features: ["Planning", "Planning semaine", "Carte"],
  },
  {
    icon: "check",
    title: "Tâches & Notes",
    description:
      "Séparez la to-do personnelle, les tâches attribuées et les notes partagées pour que chacun sache quoi faire.",
    features: ["Tâches", "To-do list", "Notes", "Notes d’équipe"],
  },
  {
    icon: "community",
    title: "Entre nous",
    description:
      "Partagez des informations, des photos et des commentaires dans un espace interne réservé à votre entreprise.",
    features: ["Entre nous"],
  },
  {
    icon: "team",
    title: "Équipe & Documents",
    description:
      "Structurez votre équipe, conservez les documents professionnels et retrouvez les notifications utiles au même endroit.",
    features: [
      "Organisation de l’équipe",
      "Documents",
      "Notifications",
    ],
  },
  {
    icon: "backup",
    title: "Organisation & Sauvegardes",
    description:
      "Pilotez les réglages de l’entreprise, consultez l’activité et conservez un historique maîtrisé de vos sauvegardes.",
    features: [
      "Journal d’activité",
      "Sauvegardes",
      "Historique des sauvegardes",
      "Sauvegarde manuelle",
      "Paramètres liés à l’organisation de l’activité",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <PublicPageHeading
        eyebrow="Nos fonctionnalités"
        title="L’essentiel, réuni simplement."
        description="LETI centralise les outils déjà utilisés au quotidien par les piscinistes, dans une interface claire pour le bureau comme pour le terrain."
      />

      <div className="mx-auto mt-16 max-w-7xl space-y-5 sm:mt-20 sm:space-y-7">
        {FEATURE_GROUPS.map((group, index) => (
          <article
            key={group.title}
            className="card grid items-center gap-8 overflow-hidden p-5 sm:p-7 lg:grid-cols-2 lg:gap-12 lg:p-9"
          >
            <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pool-50 text-pool-700 ring-1 ring-pool-100">
                <Icon name={group.icon} size={21} />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-graphite-900 sm:text-3xl">
                {group.title}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-graphite-500">
                {group.description}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label={`Fonctions de ${group.title}`}>
                {group.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-xl border border-graphite-900/10 bg-graphite-50 px-3 py-2 text-sm font-medium text-graphite-700"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
              <ScreenshotPlaceholder title={group.title} icon={group.icon} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
