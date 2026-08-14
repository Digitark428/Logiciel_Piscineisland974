import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { clientName, memberName } from "@/lib/utils/format";

/** Options client (id + libellé) pour les sélecteurs. */
export async function getClientOptions(supabase: SupabaseClient, workspaceId: string) {
  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("last_name", { nullsFirst: false });
  return (data ?? []).map((c: any) => ({ id: c.id as string, label: clientName(c) }));
}

/** Options piscine (id + libellé + client) pour les sélecteurs. */
export async function getPoolOptions(supabase: SupabaseClient, workspaceId: string) {
  const { data } = await supabase
    .from("pools")
    .select("id, name, client_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  return (data ?? []).map((p: any) => ({ id: p.id as string, label: p.name as string, client_id: p.client_id as string }));
}

/** Documents (contrats / factures) d'un workspace pour les sélecteurs de liaison prestation. */
export async function getClientDocumentOptions(supabase: SupabaseClient, workspaceId: string) {
  const { data } = await supabase
    .from("documents")
    .select("id, name, entity_id, category")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", "client")
    .in("category", ["contract", "invoice"])
    .order("created_at", { ascending: false });
  return (data ?? []).map((d: any) => ({
    id: d.id as string,
    label: d.name as string,
    client_id: (d.entity_id ?? "") as string,
    category: d.category as "contract" | "invoice",
  }));
}

/** Options membre (id + libellé) pour l'assignation. */
export async function getMemberOptions(supabase: SupabaseClient, workspaceId: string) {
  const { data } = await supabase
    .from("memberships")
    .select("id, first_name, last_name, email")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("first_name", { nullsFirst: false });
  return (data ?? []).map((m: any) => ({ id: m.id as string, label: memberName(m) }));
}
