import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSessionContext } from "@/lib/auth/context";
import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  const ctx = await getSessionContext();
  if (ctx) redirect("/app");

  return (
    <div className="min-h-screen bg-graphite-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="btn-ghost">Se connecter</Link>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-graphite-900">Créer mon espace</h1>
          <p className="mt-2 text-graphite-500">
            Votre entreprise obtient son espace isolé et son code entreprise unique.
          </p>
        </div>
        <SignUpForm />
      </main>
    </div>
  );
}
