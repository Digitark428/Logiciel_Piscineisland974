import Link from "next/link";
import { Logo } from "@/components/Logo";

const FEATURES = [
  { title: "Clients & piscines", desc: "Fiches complètes, plusieurs piscines par client, historique et documents." },
  { title: "Prestations & planning", desc: "Interventions uniques ou récurrentes, dates manuelles, vue jour / semaine / mois / année." },
  { title: "Équipe & permissions", desc: "Créez les comptes de vos employés et définissez précisément leurs accès." },
  { title: "Terrain & mobile", desc: "Sur iPad ou téléphone : tâches, photos, itinéraire « Y aller », prestation terminée." },
  { title: "Documents & factures", desc: "Contrats, factures, exports PDF, sauvegardes automatiques quotidiennes." },
  { title: "Sécurité multi-tenant", desc: "Chaque entreprise isolée. RLS Supabase, stockage privé, journal d'activité." },
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
            Le logiciel des piscinistes
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-graphite-900 sm:text-5xl">
            Gérez toute votre activité piscine, simplement.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-graphite-500">
            Clients, piscines, prestations, planning et équipe — réunis dans un outil rapide,
            fiable et agréable à utiliser, sur ordinateur, iPad et téléphone.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Créer mon espace</Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">J'ai déjà un espace</Link>
            <Link href="/demo" className="btn-ghost px-6 py-3 text-base">Essayer la démo →</Link>
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
