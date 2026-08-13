import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSessionContext } from "@/lib/auth/context";
import { LoginFlow } from "./LoginFlow";

export default async function LoginPage() {
  const ctx = await getSessionContext();
  if (ctx) redirect("/app");

  return (
    <div className="flex min-h-screen flex-col bg-graphite-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/signup" className="btn-ghost">Créer un espace</Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          <LoginFlow />
        </div>
      </main>
    </div>
  );
}
