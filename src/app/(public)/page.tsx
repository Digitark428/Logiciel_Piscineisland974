import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketingVideo } from "@/components/public/MarketingVideo";

export const metadata: Metadata = {
  title: "LETI — Logiciel pour piscinistes",
  description:
    "LETI, le logiciel simple et puissant pensé pour organiser l’activité des piscinistes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LETI — Logiciel pour piscinistes",
    description:
      "Un logiciel simple et puissant pensé pour organiser l’activité des piscinistes.",
    siteName: "LETI",
    type: "website",
    url: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <section className="flex min-h-[calc(100svh-4.5rem)] items-center px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <Logo
            size="hero"
            orientation="vertical"
            symbolEffect="hero"
            className="justify-center"
          />
          <p className="mt-7 text-base font-medium tracking-[-0.01em] text-graphite-500 sm:text-lg">
            Logiciel pour piscinistes
          </p>
          <h1 className="mt-3 text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.055em] text-graphite-900 sm:text-6xl">
            Simple mais puissant.
          </h1>
          <Link
            href="/login"
            className="mt-8 inline-flex min-h-11 items-center rounded-xl px-4 py-2.5 text-base font-semibold text-graphite-700 underline decoration-pool-300 decoration-2 underline-offset-[0.35rem] transition hover:text-pool-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2"
          >
            Se connecter
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="presentation-video-title"
        className="border-t border-graphite-900/5 bg-white px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-8 max-w-xl text-center sm:mb-10">
            <p className="leti-eyebrow text-pool-800">Découvrir LETI</p>
            <h2
              id="presentation-video-title"
              className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-graphite-900 sm:text-3xl"
            >
              LETI en quelques minutes.
            </h2>
          </div>
          <MarketingVideo />
        </div>
      </section>
    </>
  );
}
