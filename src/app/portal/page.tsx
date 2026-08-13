import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function PortalInfoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-50 px-5">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-8">
          <h1 className="text-xl font-bold text-graphite-900">Espace client</h1>
          <p className="mt-2 text-sm text-graphite-500">
            Pour accéder à votre espace, utilisez le lien privé qui vous a été communiqué par votre
            pisciniste, puis saisissez votre code d'accès personnel.
          </p>
          <Link href="/" className="btn-secondary mt-6 inline-block">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
