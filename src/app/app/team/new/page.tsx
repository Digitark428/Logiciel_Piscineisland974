import Link from "next/link";
import { requireContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { NewMemberForm } from "./NewMemberForm";

export default async function NewMemberPage() {
  const ctx = await requireContext();
  if (!ctx.isAdmin) redirect("/app");
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/team" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Équipe</Link>
      <PageHeader title="Nouveau membre" subtitle="Créez le compte d'un membre de votre équipe." />
      <NewMemberForm />
    </div>
  );
}
