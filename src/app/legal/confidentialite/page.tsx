import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Confidentialité — LETI" };

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="btn-ghost">Accueil</Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="text-3xl font-bold tracking-tight text-graphite-900">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-graphite-400">Modèle à compléter avec les informations réelles de l'entreprise exploitant le logiciel.</p>

        <div className="prose mt-8 space-y-6 text-graphite-700">
          <Section title="1. Responsable du traitement">
            Les données saisies dans LETI sont traitées pour le compte de chaque entreprise
            cliente (le « responsable de traitement »), dans son espace isolé.
          </Section>
          <Section title="2. Données collectées">
            Selon l'usage : identité et coordonnées des clients, informations sur les piscines et prestations,
            documents, factures, et données des membres de l'équipe. Les données sont minimisées à ce qui est
            nécessaire à la gestion de l'activité.
          </Section>
          <Section title="3. Base légale et finalités">
            Exécution des prestations, gestion de la relation client, obligations légales et comptables.
          </Section>
          <Section title="4. Sécurité">
            Séparation stricte des espaces (multi-tenant), contrôle d'accès par rôles et permissions,
            row level security au niveau de la base de données, stockage privé des fichiers avec accès par liens
            signés temporaires, journalisation des actions sensibles et sauvegardes régulières.
          </Section>
          <Section title="5. Vos droits (RGPD)">
            Droit d'accès, de rectification, d'effacement, de limitation et de portabilité. Ces droits
            s'exercent auprès de l'entreprise responsable de votre suivi, qui dispose des outils nécessaires
            dans l'application (modification, archivage, suppression, export).
          </Section>
          <Section title="6. Durée de conservation">
            Les données sont conservées le temps de la relation commerciale et selon les obligations légales
            applicables, puis archivées ou supprimées.
          </Section>
          <Section title="7. Contact">
            Pour toute demande relative à vos données, contactez l'entreprise responsable de votre suivi.
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-graphite-900">{title}</h2>
      <p className="mt-1.5 text-graphite-600">{children}</p>
    </section>
  );
}
