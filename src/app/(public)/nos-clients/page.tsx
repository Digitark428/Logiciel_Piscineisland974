import type { Metadata } from "next";
import {
  PublicPageHeading,
  VideoPlaceholder,
} from "@/components/public/PublicPage";

export const metadata: Metadata = {
  title: "Nos clients — LETI",
  description:
    "Un espace destiné aux entreprises qui utilisent LETI et à leurs futurs retours d’expérience.",
  alternates: {
    canonical: "/nos-clients",
  },
};

const LOGO_PLACEHOLDERS = Array.from({ length: 8 }, (_, index) => index + 1);

export default function ClientsPage() {
  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <PublicPageHeading
        eyebrow="Nos clients"
        title="Des professionnels au cœur de LETI."
        description="Cette page accueillera les entreprises utilisatrices et leurs retours d’expérience, à mesure qu’ils seront prêts à être partagés."
      />

      <section aria-labelledby="client-logos-title" className="mx-auto mt-16 max-w-7xl sm:mt-20">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="leti-eyebrow text-pool-800">Entreprises</p>
            <h2 id="client-logos-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-graphite-900 sm:text-3xl">
              Ils feront vivre LETI.
            </h2>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {LOGO_PLACEHOLDERS.map((index) => (
            <div
              key={index}
              className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-graphite-200 bg-white px-4 text-center sm:min-h-40"
            >
              <div>
                <span className="mx-auto block h-1.5 w-9 rounded-full bg-pool-200" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite-400">
                  Logo client
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="testimonials-title" className="mx-auto mt-20 max-w-7xl sm:mt-28">
        <p className="leti-eyebrow text-pool-800">Témoignages</p>
        <h2 id="testimonials-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-graphite-900 sm:text-3xl">
          Leurs retours, bientôt ici.
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <article key={item} className="card min-h-56 p-6 sm:p-8">
              <span aria-hidden className="text-4xl font-semibold leading-none text-pool-300">“</span>
              <p className="mt-4 text-base font-medium text-graphite-600">
                Témoignage écrit à venir
              </p>
              <div className="mt-12 flex items-center gap-3">
                <span className="h-10 w-10 rounded-full border border-dashed border-graphite-200 bg-graphite-50" />
                <div>
                  <p className="text-sm font-semibold text-graphite-600">Nom du client</p>
                  <p className="text-xs text-graphite-400">Entreprise</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <VideoPlaceholder label="Témoignage vidéo client" />
          <VideoPlaceholder label="Témoignage vidéo client" />
        </div>
      </section>
    </div>
  );
}
