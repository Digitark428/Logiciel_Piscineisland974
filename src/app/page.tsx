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
    desc: "Emportez Piscine Island partout avec vous. Tâches, photos, itinéraires et interventions directement depuis votre téléphone.",
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
    <div className="min-h-screen bg-gradient-to-b from-white to-graphite-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Se connecter</Link>
          <Link href="/signup" className="btn-primary">Créer mon espace</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="py-14 sm:py-20 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-pool-50 px-3 py-1 text-sm font-medium text-pool-700">
            L’outil pensé pour les piscinistes
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-graphite-900 sm:text-5xl">
            Toute votre activité piscine. Au même endroit.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-graphite-500">
            Clients, piscines, interventions, planning et équipe : tout ce dont vous avez besoin pour
            travailler plus efficacement, depuis un seul outil.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Créer mon espace</Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">Se connecter</Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="text-base font-semibold text-graphite-900">{f.title}</h3>
              <p className="mt-2 text-sm text-graphite-500">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-graphite-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-graphite-400 sm:flex-row">
          <Logo showText />
          <div className="flex items-center gap-4">
            <Link href="/legal/confidentialite" className="hover:text-graphite-600">Confidentialité</Link>
            <Link href="/portal" className="hover:text-graphite-600">Espace client</Link>
            <span>© {new Date().getFullYear()} Piscine Island</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
