import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../ClientForm";

export default async function NewClientPage() {
  await requirePermission("clients.edit");
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/clients" className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← Mes clients</Link>
      <PageHeader title="Nouveau client" />
      <ClientForm />
    </div>
  );
}
