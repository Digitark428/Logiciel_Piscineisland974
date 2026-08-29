import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LETI",
    description: "LETI, logiciel pour piscinistes : simple et puissant.",
    siteName: "LETI",
    type: "website",
    url: "/",
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-graphite-50">
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:py-16">
        <section className="flex w-full max-w-3xl flex-col items-center text-center">
          <Logo size="hero" orientation="vertical" symbolEffect="hero" className="mb-7 justify-center" />
          <div className="leti-hero-slogan w-full max-w-xl px-5 py-5 sm:px-8 sm:py-6">
            <p className="leti-eyebrow text-pool-800">Logiciel pour piscinistes</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-graphite-900 sm:text-5xl">
              SIMPLE ET PUISSANT
            </h1>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-graphite-500">
            Clients, interventions, planning et équipe : tout ce dont vous avez besoin pour
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
