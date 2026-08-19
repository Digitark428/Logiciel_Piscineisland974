import Link from "next/link";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    title: "Clients & piscines",
    desc: "Retrouvez toutes les informations au même endroit. Clients, piscines, historique, documents et interventions.",
  },
  {
    title: "Planning & interventions",
    desc: "Planifiez vos interventions, ponctuelles ou récurrentes, avec une vision claire de votre activité.",
  },
  {
    title: "Équipe & accès",
    desc: "Donnez à chaque membre de votre équipe les bons accès, au bon moment.",
  },
  {
    title: "Sur le terrain",
    desc: "Emportez LETI partout avec vous. Tâches, photos, itinéraires et interventions directement depuis votre téléphone.",
  },
  {
    title: "Documents & facturation",
    desc: "Contrats, factures et documents essentiels, toujours accessibles et automatiquement sauvegardés.",
  },
  {
    title: "Sécurité & confidentialité",
    desc: "Vos données restent privées et protégées. Chaque entreprise dispose de son espace sécurisé.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-graphite-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Se connecter</Link>
          <Link href="/signup" className="btn-primary">Créer mon espace</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="relative isolate overflow-hidden py-16 text-center sm:py-24">
          <div aria-hidden="true" className="absolute left-1/2 top-8 -z-10 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-pool-100/60 blur-3xl sm:h-72" />
          <Logo size="hero" className="mb-7 justify-center" />
          <p className="leti-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/55 px-3 py-1.5 text-pool-800 shadow-sm backdrop-blur-sm">
            Logiciel pour piscinistes
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-graphite-900 sm:text-6xl">
            Votre activité piscine, simplement maîtrisée.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-graphite-500">
            Clients, piscines, interventions, planning et équipe : tout ce dont vous avez besoin pour
            travailler plus efficacement, depuis un seul outil.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Créer mon espace</Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">Se connecter</Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:border-pool-200 hover:shadow-float">
              <h3 className="text-base font-semibold text-graphite-900">{f.title}</h3>
              <p className="mt-2 text-sm text-graphite-500">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-graphite-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-graphite-400 sm:flex-row">
          <Logo showText />
          <div className="flex items-center gap-4">
            <Link href="/legal/confidentialite" className="hover:text-graphite-600">Confidentialité</Link>
            <Link href="/portal" className="hover:text-graphite-600">Espace client</Link>
            <span>© {new Date().getFullYear()} LETI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
