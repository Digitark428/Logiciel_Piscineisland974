import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-graphite-50">
      <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-5 py-12 sm:py-16">
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-72 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pool-100/60 blur-3xl sm:h-80" />
        <section className="flex w-full max-w-3xl flex-col items-center text-center">
          <Logo size="hero" className="mb-8 justify-center" />
          <p className="leti-eyebrow mb-5 inline-flex items-center rounded-full border border-white/75 bg-white/55 px-3 py-1.5 text-pool-800 shadow-sm backdrop-blur-sm">
            Logiciel pour pisciniste
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
      </main>

      <footer className="px-5 py-6 text-center text-sm text-graphite-400">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/legal/confidentialite" className="hover:text-graphite-600">Confidentialité</Link>
          <Link href="/portal" className="hover:text-graphite-600">Espace client</Link>
          <span>© 2026 LETI</span>
        </div>
      </footer>
    </div>
  );
}
