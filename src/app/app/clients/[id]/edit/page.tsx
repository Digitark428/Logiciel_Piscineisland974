import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../../ClientForm";
import { clientName } from "@/lib/utils/format";
import type { Client } from "@/lib/db/types";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const ctx = await requirePermission("clients.edit");
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/clients/${params.id}`} className="mb-4 inline-block text-sm text-graphite-500 hover:text-graphite-700">← {clientName(client)}</Link>
      <PageHeader title="Modifier le client" />
      <ClientForm client={client as Client} />
    </div>
  );
}
