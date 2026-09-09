import Link from "next/link";
import { Logo } from "@/components/Logo";

const NAVIGATION = [
  { href: "/fonctionnalites", label: "Nos fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/qui-sommes-nous", label: "Qui sommes-nous ?" },
  { href: "/nos-clients", label: "Nos clients" },
] as const;

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-lg px-1 py-2 text-sm font-medium text-graphite-600 transition hover:text-graphite-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-graphite-900/5 bg-graphite-50/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label="LETI — Accueil"
          className="inline-flex min-h-11 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2"
        >
          <Logo />
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-6 xl:flex">
          {NAVIGATION.map((item) => (
            <Link key={item.href} href={item.href} className={NAV_LINK}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link href="/login" className="btn-ghost whitespace-nowrap">
            Se connecter
          </Link>
          <Link href="/signup" className="btn-primary whitespace-nowrap">
            Créer un compte
          </Link>
        </div>

        <details className="group relative xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-graphite-200 bg-white px-3.5 text-sm font-semibold text-graphite-800 shadow-[0_1px_2px_rgba(24,58,89,0.025)] focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Ouvrir la navigation</span>
            <span aria-hidden className="flex w-5 flex-col gap-1.5">
              <span className="h-px w-5 bg-current" />
              <span className="h-px w-5 bg-current" />
              <span className="h-px w-5 bg-current" />
            </span>
            <span>Menu</span>
          </summary>
          <nav
            aria-label="Navigation mobile"
            className="absolute right-0 top-[calc(100%+0.6rem)] w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-graphite-900/10 bg-white p-2 shadow-float"
          >
            <div className="flex flex-col">
              {NAVIGATION.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-xl px-3.5 text-sm font-medium text-graphite-700 transition hover:bg-graphite-50 hover:text-graphite-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-2 border-t border-graphite-100 pt-2">
              <Link href="/login" className="btn-secondary w-full">
                Se connecter
              </Link>
              <Link href="/signup" className="btn-primary mt-2 w-full">
                Créer un compte
              </Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-graphite-900/5 bg-white px-5 py-7 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-graphite-400 sm:flex-row">
        <Logo />
        <nav
          aria-label="Liens de pied de page"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          <Link
            href="/legal/confidentialite"
            className="inline-flex min-h-11 items-center rounded-lg py-1 hover:text-graphite-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2"
          >
            Confidentialité
          </Link>
          <Link
            href="/portal"
            className="inline-flex min-h-11 items-center rounded-lg py-1 hover:text-graphite-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2"
          >
            Espace client
          </Link>
          <span>© 2026 LETI</span>
        </nav>
      </div>
    </footer>
  );
}
