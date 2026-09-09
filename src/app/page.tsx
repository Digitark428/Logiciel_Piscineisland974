import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/app/icons";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "LETI — Logiciel de gestion pour piscinistes",
  description:
    "Clients, entretiens, planning et équipe réunis dans un outil simple et puissant, pensé pour les piscinistes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LETI — Logiciel de gestion pour piscinistes",
    description:
      "Clients, entretiens, planning et équipe réunis dans un outil simple et puissant.",
    siteName: "LETI",
    type: "website",
    url: "/",
  },
};

const FEATURES = [
  {
    icon: "users",
    title: "Clients",
    description:
      "Centralisez les coordonnées, documents et informations utiles de chaque client dans une fiche claire.",
  },
  {
    icon: "wrench",
    title: "Entretiens",
    description:
      "Préparez, suivez et clôturez vos entretiens ponctuels ou récurrents depuis un seul endroit.",
  },
  {
    icon: "calendar",
    title: "Planning",
    description:
      "Visualisez les passages, tâches et événements pour organiser simplement votre semaine.",
  },
  {
    icon: "check",
    title: "Tâches & Notes",
    description:
      "Gardez votre to-do personnelle, les tâches attribuées et les notes d’équipe à portée de main.",
  },
  {
    icon: "community",
    title: "Entre nous",
    description:
      "Échangez avec votre équipe dans un espace privé pour partager informations, photos et commentaires.",
  },
  {
    icon: "map",
    title: "Carte",
    description:
      "Repérez les interventions de la journée et les techniciens directement sur la carte.",
  },
  {
    icon: "team",
    title: "Équipe & Gestion",
    description:
      "Retrouvez votre équipe, vos documents, sauvegardes, notifications et votre journal d’activité.",
  },
] as const;

const ROADMAP = [
  { icon: "wrench", title: "Mes chantiers", tone: "coral" },
  { icon: "wrench", title: "Mes dépannages", tone: "coral" },
  { icon: "receipt", title: "Gérer ma comptabilité", tone: "coral" },
  { icon: "sparkles", title: "LETI IA", tone: "aqua" },
] as const;

const FOCUS_RING =
  "inline-flex min-h-11 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2";

function PublicNavigation() {
  return (
    <header className="sticky top-0 z-40 border-b border-graphite-900/5 bg-graphite-50/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
        <Link href="#accueil" aria-label="LETI — Retour en haut de page" className={FOCUS_RING}>
          <Logo />
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          <Link href="#fonctionnalites" className={`${FOCUS_RING} px-1 py-2 text-sm font-medium text-graphite-600 transition hover:text-graphite-900`}>
            Fonctionnalités
          </Link>
          <Link href="#pour-qui" className={`${FOCUS_RING} px-1 py-2 text-sm font-medium text-graphite-600 transition hover:text-graphite-900`}>
            Pour qui ?
          </Link>
          <Link href="#a-venir" className={`${FOCUS_RING} px-1 py-2 text-sm font-medium text-graphite-600 transition hover:text-graphite-900`}>
            À venir
          </Link>
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login" className="btn-ghost whitespace-nowrap">
            Se connecter
          </Link>
          <Link href="/signup" className="btn-primary whitespace-nowrap">
            Créer un compte
          </Link>
        </div>

        <details className="group relative sm:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-xl border border-graphite-200 bg-white px-4 text-sm font-semibold text-graphite-800 shadow-[0_1px_2px_rgba(24,58,89,0.025)] focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav aria-label="Navigation mobile" className="absolute right-0 top-[calc(100%+0.6rem)] w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl border border-graphite-900/10 bg-white p-2 shadow-float">
            <Link href="/login" className="btn-secondary w-full">
              Se connecter
            </Link>
            <Link href="/signup" className="btn-primary mt-2 w-full">
              Créer un compte
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[39rem] lg:mx-0">
      <figcaption className="sr-only">Aperçu illustratif du tableau de bord et du planning LETI avec des données fictives.</figcaption>
      <div aria-hidden className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-pool-100/45 blur-2xl sm:-inset-8" />
      <div className="overflow-hidden rounded-[1.6rem] border border-graphite-900/10 bg-white shadow-[0_18px_50px_rgba(24,58,89,0.09)] sm:rounded-[2rem]">
        <div className="flex min-h-12 items-center justify-between border-b border-graphite-100 px-4 sm:px-6">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-coral-300" />
            <span className="h-2 w-2 rounded-full bg-pool-300" />
            <span className="h-2 w-2 rounded-full bg-graphite-200" />
          </div>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-graphite-400">Aperçu LETI</span>
        </div>

        <div className="grid sm:grid-cols-[4.75rem_1fr]">
          <aside aria-hidden className="hidden border-r border-graphite-100 bg-graphite-50/80 py-5 sm:flex sm:flex-col sm:items-center sm:gap-3">
            <Logo showText={false} />
            {["home", "users", "wrench", "calendar", "check", "map"].map((icon, index) => (
              <span
                key={icon}
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${index === 0 ? "bg-pool-100 text-pool-800" : "text-graphite-400"}`}
              >
                <Icon name={icon} size={17} />
              </span>
            ))}
          </aside>

          <div className="min-w-0 bg-graphite-50/70 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-medium text-graphite-400">Votre activité</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-graphite-900 sm:text-xl">Aujourd’hui</p>
              </div>
              <span className="badge border-pool-100 bg-pool-50 text-pool-700">3 entretiens</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="rounded-2xl border border-pool-100/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(24,58,89,0.025)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pool-100/80 text-pool-700">
                  <Icon name="calendar" size={16} />
                </span>
                <p className="mt-3 text-[0.68rem] font-medium text-graphite-400">À venir</p>
                <p className="mt-0.5 text-lg font-semibold text-graphite-900">3</p>
              </div>
              <div className="rounded-2xl border border-coral-100/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(24,58,89,0.025)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral-100/80 text-coral-700">
                  <Icon name="check" size={16} />
                </span>
                <p className="mt-3 text-[0.68rem] font-medium text-graphite-400">Tâches</p>
                <p className="mt-0.5 text-lg font-semibold text-graphite-900">2</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-pool-100/80 bg-white p-4 shadow-[0_1px_2px_rgba(24,58,89,0.025)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-graphite-900">Planning du jour</p>
                <span className="text-[0.68rem] font-medium text-pool-700">Voir le planning →</span>
              </div>
              <ul className="mt-3 divide-y divide-graphite-100">
                {[
                  ["08:30", "Villa Horizon", "Planifié"],
                  ["10:15", "Résidence Azur", "En cours"],
                  ["14:00", "Piscine Martin", "Planifié"],
                ].map(([time, client, status]) => (
                  <li key={client} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0">
                    <span className="w-9 shrink-0 text-[0.68rem] font-semibold text-graphite-500">{time}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-graphite-800 sm:text-sm">{client}</span>
                    <span className={`hidden rounded-lg border px-2 py-0.5 text-[0.62rem] font-medium sm:inline ${status === "En cours" ? "border-coral-100 bg-coral-50 text-graphite-700" : "border-pool-100 bg-pool-50 text-pool-700"}`}>
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="leti-eyebrow text-pool-800">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-graphite-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-graphite-500 sm:text-lg">{description}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-graphite-50">
      <PublicNavigation />

      <main>
        <section id="accueil" className="relative isolate scroll-mt-24 overflow-hidden px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:px-10 lg:pb-32 lg:pt-24">
          <svg aria-hidden className="absolute -bottom-1 left-0 -z-10 h-32 w-full text-pool-100/70 sm:h-44" viewBox="0 0 1440 180" fill="none" preserveAspectRatio="none">
            <path d="M0 91C227 12 380 152 615 80C869 2 1053 135 1440 40V180H0V91Z" fill="currentColor" />
          </svg>

          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <div className="max-w-2xl">
              <p className="leti-eyebrow text-pool-800">Logiciel pour piscinistes</p>
              <h1 className="mt-4 text-[2.55rem] font-semibold leading-[1.03] tracking-[-0.055em] text-graphite-900 sm:text-6xl lg:text-[3.45rem] xl:text-[4.15rem]">
                Toute votre activité,{" "}
                <span className="block">simplement organisée.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-graphite-500 sm:text-xl sm:leading-9">
                Clients, entretiens, planning et équipe réunis dans un seul outil.
              </p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center">
                <Link href="/signup" className="btn-primary whitespace-nowrap px-6 py-3 text-base">
                  Créer un compte
                </Link>
                <Link href="#fonctionnalites" className="btn-secondary whitespace-nowrap px-6 py-3 text-base">
                  Découvrir les fonctionnalités
                </Link>
              </div>
              <p className="mt-7 flex items-center gap-3 text-sm font-semibold text-graphite-700">
                <span aria-hidden className="h-px w-8 bg-coral-400" />
                Simple et puissant.
              </p>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section id="fonctionnalites" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Votre quotidien"
              title="Tout votre quotidien dans LETI."
              description="Les informations utiles sont réunies dans des espaces simples à retrouver et faciles à utiliser."
            />

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <article
                  key={feature.title}
                  className={`card p-5 sm:p-6 ${index === FEATURES.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pool-50 text-pool-700">
                    <Icon name={feature.icon} size={20} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-graphite-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-graphite-500">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pour-qui" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <SectionHeading
              eyebrow="Pensé pour le terrain"
              title="Naturel au bureau. Pratique en intervention."
              description="LETI vous accompagne sur ordinateur, tablette et téléphone, avec la même navigation claire."
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["home", "Au bureau", "Préparez la semaine et gardez une vue d’ensemble."],
                ["calendar", "En déplacement", "Retrouvez rapidement le planning et les informations utiles."],
                ["wrench", "Sur le terrain", "Suivez les passages sans disperser votre activité."],
              ].map(([icon, title, text]) => (
                <article key={title} className="card flex min-h-48 flex-col p-5 sm:p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pool-700 ring-1 ring-pool-100">
                    <Icon name={icon} size={19} />
                  </span>
                  <h3 className="mt-6 text-base font-semibold text-graphite-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-graphite-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="a-venir" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="À venir"
              title="LETI continue d’évoluer."
              description="Ces modules sont en préparation. Ils ne sont pas encore disponibles dans LETI."
            />

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROADMAP.map((item) => (
                <article key={item.title} className="card flex min-h-48 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone === "aqua" ? "bg-pool-50 text-pool-700" : "bg-coral-50 text-coral-700"}`}>
                      <Icon name={item.icon} size={19} />
                    </span>
                    <span className={`leti-development-badge badge uppercase tracking-[0.08em] ${item.tone === "aqua" ? "leti-development-badge--aqua" : ""}`}>
                      En développement
                    </span>
                  </div>
                  <h3 className="mt-auto pt-8 text-base font-semibold text-graphite-900">{item.title}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.75rem] border border-pool-100 bg-white px-6 py-12 text-center shadow-[0_12px_40px_rgba(24,58,89,0.055)] sm:px-12 sm:py-16">
            <p className="leti-eyebrow text-pool-800">Commencer simplement</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] text-graphite-900 sm:text-4xl">
              Prêt à simplifier votre quotidien ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-graphite-500 sm:text-lg">
              Créez votre espace LETI et retrouvez votre activité dans un seul outil.
            </p>
            <div className="mt-8">
              <Link href="/signup" className="btn-primary px-7 py-3 text-base">
                Créer un compte
              </Link>
            </div>
            <p className="mt-6 text-sm text-graphite-500">
              Vous utilisez déjà LETI ?{" "}
              <Link href="/login" className={`${FOCUS_RING} font-semibold text-graphite-800 underline decoration-pool-300 underline-offset-4 hover:text-pool-800`}>
                Se connecter
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-graphite-900/5 bg-white px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-graphite-400 sm:flex-row">
          <Logo />
          <nav aria-label="Liens de pied de page" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/legal/confidentialite" className={`${FOCUS_RING} py-1 hover:text-graphite-700`}>
              Confidentialité
            </Link>
            <Link href="/portal" className={`${FOCUS_RING} py-1 hover:text-graphite-700`}>
              Espace client
            </Link>
            <span>© 2026 LETI</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
