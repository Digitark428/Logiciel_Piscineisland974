import { requirePermission, can } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { UploadBox, DocRow } from "./DocumentsClient";

export default async function DocumentsPage() {
  const ctx = await requirePermission("documents.view");
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("id, name, size_bytes, created_at, storage_path, mime_type")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const documentUrls = await signedUrls("documents", (docs ?? []).map((document) => document.storage_path));
  const withUrls = (docs ?? []).map((d) => ({ d, url: documentUrls.get(d.storage_path) ?? null }));
  const canManage = can(ctx, "documents.manage");

  return (
    <div>
      <PageHeader title="Documents" description="Consultez et partagez les fichiers sécurisés de votre entreprise." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {withUrls.length === 0 ? (
            <EmptyState title="Aucun document" description="Ajoutez vos premiers fichiers." />
          ) : (
            <Card className="p-0 overflow-hidden">
              <ul className="divide-y divide-graphite-100">
                {withUrls.map(({ d, url }) => <DocRow key={d.id} doc={d} url={url} />)}
              </ul>
            </Card>
          )}
        </div>
        {canManage && <div><UploadBox /></div>}
      </div>
    </div>
  );
}
