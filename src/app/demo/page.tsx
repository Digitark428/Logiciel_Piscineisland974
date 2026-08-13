import Link from "next/link";
import { Logo } from "@/components/Logo";
import { enterDemo } from "@/lib/actions/demo";

export default function DemoPage({ searchParams }: { searchParams: { error?: string } }) {
  const error =
    searchParams.error === "config"
      ? "La démo n'est pas encore configurée. Lancez le script de bootstrap (voir README)."
      : searchParams.error === "login"
        ? "Compte de démonstration indisponible. Vérifiez le bootstrap de la démo."
        : null;
  return (
    <div className="flex min-h-screen flex-col bg-graphite-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="btn-ghost">Se connecter</Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <span className="badge bg-amber-100 text-amber-800">Mode démo</span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-graphite-900">Essayer Piscine Island</h1>
            <p className="mt-2 text-graphite-500">
              Un véritable espace de démonstration, isolé, avec de vraies données. Testez librement.
            </p>
          </div>
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">{error}</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <form action={enterDemo}>
              <input type="hidden" name="role" value="manager" />
              <button className="card flex w-full flex-col items-start p-6 text-left transition hover:shadow-float">
                <span className="text-2xl">👔</span>
                <span className="mt-2 font-semibold text-graphite-900">Démo Gérant</span>
                <span className="text-sm text-graphite-500">Accès administrateur complet</span>
              </button>
            </form>
            <form action={enterDemo}>
              <input type="hidden" name="role" value="member" />
              <button className="card flex w-full flex-col items-start p-6 text-left transition hover:shadow-float">
                <span className="text-2xl">🧰</span>
                <span className="mt-2 font-semibold text-graphite-900">Démo Membre</span>
                <span className="text-sm text-graphite-500">Parcours employé & permissions</span>
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-graphite-400">
            Les données de démonstration peuvent être réinitialisées à tout moment depuis l'espace.
          </p>
        </div>
      </main>
    </div>
  );
}
