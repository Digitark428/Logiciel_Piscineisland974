"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionContext, logActivity } from "@/lib/actions/helpers";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const ALLOWED_ENTITIES = ["client", "pool", "service", "contract", "invoice", "member", "workspace"];

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

  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${ctx.workspace.id}/${entity_type}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from("documents").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return fail("Téléversement impossible (droits insuffisants ?).");

  const { error } = await supabase.from("documents").insert({
    workspace_id: ctx.workspace.id,
    name: file.name.slice(0, 200),
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    entity_type,
    entity_id,
    uploaded_by: ctx.membership.id,
  });
  if (error) {
    await supabase.storage.from("documents").remove([path]);
    return fail("Enregistrement impossible.");
  }

  await logActivity(ctx, { action: "create", entity_type: "document", summary: `Document ajouté : ${file.name}` });
  revalidatePath("/app/documents");
  if (entity_id) revalidatePath(`/app/${entity_type}s/${entity_id}`);
  return ok("Document ajouté.");
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const res = await actionContext();
  if ("error" in res) return res.error;
  const { ctx } = res;
  const supabase = createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).eq("workspace_id", ctx.workspace.id).maybeSingle();
  if (doc?.storage_path) await supabase.storage.from("documents").remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("workspace_id", ctx.workspace.id);
  if (error) return fail("Suppression impossible.");
  await logActivity(ctx, { action: "delete", entity_type: "document", summary: "Document supprimé" });
  revalidatePath("/app/documents");
  return ok("Document supprimé.");
}
