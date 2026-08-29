"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const ALLOWED_ENTITIES = ["client", "pool", "service", "contract", "invoice", "member", "workspace"];
const ALLOWED_CATEGORIES = ["invoice", "contract", "photo", "other"];
const DOCUMENT_TYPES = {
  "application/pdf": (b: Buffer) => b.subarray(0, 5).toString("ascii") === "%PDF-",
  "image/png": (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b: Buffer) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
} as const;

function validDocumentBuffer(type: string, buffer: Buffer): type is keyof typeof DOCUMENT_TYPES {
  return type in DOCUMENT_TYPES && DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES](buffer);
}

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return fail("Aucun fichier sélectionné.");
  if (file.size > 20 * 1024 * 1024) return fail("Fichier trop volumineux (max 20 Mo).");

  const entity_type = String(formData.get("entity_type") ?? "workspace");
  const entity_id = (String(formData.get("entity_id") ?? "").trim() || null) as string | null;
  if (!ALLOWED_ENTITIES.includes(entity_type)) return fail("Rattachement invalide.");

  const categoryRaw = String(formData.get("category") ?? "other");
  const category = ALLOWED_CATEGORIES.includes(categoryRaw) ? categoryRaw : "other";

  // Nom lisible : libellé fourni (ex. « Contrat entretien annuel 2026 ») sinon nom du fichier.
  const customName = String(formData.get("doc_name") ?? "").trim();
  const displayName = (customName || file.name).slice(0, 200);

  const supabase = await createClient();
  if (!entity_id) return fail("Rattachement requis.");
  const { data: entity } = entity_type === "client"
    ? await supabase.from("clients").select("id").eq("id", entity_id).eq("workspace_id", ctx.workspace.id).maybeSingle()
    : entity_type === "pool"
      ? await supabase.from("pools").select("id").eq("id", entity_id).eq("workspace_id", ctx.workspace.id).maybeSingle()
      : entity_type === "service"
        ? await supabase.from("services").select("id").eq("id", entity_id).eq("workspace_id", ctx.workspace.id).maybeSingle()
        : entity_type === "contract"
          ? await supabase.from("contracts").select("id").eq("id", entity_id).eq("workspace_id", ctx.workspace.id).maybeSingle()
          : entity_type === "invoice"
            ? await supabase.from("invoices").select("id").eq("id", entity_id).eq("workspace_id", ctx.workspace.id).maybeSingle()
            : entity_type === "member"
              ? await supabase.from("memberships").select("id").eq("id", entity_id).eq("workspace_id", ctx.workspace.id).maybeSingle()
              : await supabase.from("workspaces").select("id").eq("id", entity_id).eq("id", ctx.workspace.id).maybeSingle();
  if (!entity) return fail("Rattachement introuvable dans cet espace.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${ctx.workspace.id}/${entity_type}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validDocumentBuffer(file.type, buffer)) return fail("Type de fichier non autorisé ou fichier invalide.");

  const { error: upErr } = await supabase.storage.from("documents").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return fail("Téléversement impossible (droits insuffisants ?).");

  const { error } = await supabase.from("documents").insert({
    workspace_id: ctx.workspace.id,
    name: displayName,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    entity_type,
    entity_id,
    category,
    uploaded_by: ctx.membership.id,
  });
  if (error) {
    await supabase.storage.from("documents").remove([path]);
    return fail("Enregistrement impossible.");
  }

  const kindLabel = category === "invoice" ? "Facture" : category === "contract" ? "Contrat" : "Document";
  await logActivity(ctx, { action: "create", entity_type: "document", summary: `${kindLabel} ajouté : ${displayName}` });
  revalidatePath("/app/documents");
  if (entity_id) revalidatePath(`/app/${entity_type}s/${entity_id}`);
  return ok(`${kindLabel} ajouté.`);
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).eq("workspace_id", ctx.workspace.id).maybeSingle();
  if (doc?.storage_path) await supabase.storage.from("documents").remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "document", summary: "Document supprimé" });
  revalidatePath("/app/documents");
  return ok("Document supprimé.");
}
