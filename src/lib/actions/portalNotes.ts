"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { portalCookieName, verifyPortalSession } from "@/lib/portal";
import { clientName } from "@/lib/utils/format";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

/**
 * Note ajoutée par le client depuis la fiche d'une de ses prestations (portail).
 * Écriture via service_role : workspace_id / client_id / service_id sont dérivés
 * côté serveur de la session portail vérifiée — aucune usurpation possible.
 * La note est ensuite visible par l'équipe (RLS 0018), et une notification est créée.
 */
export async function addPortalServiceNote(
  token: string,
  serviceId: string,
  content: string,
  isImportant: boolean,
): Promise<ActionResult> {
  if (!token || !serviceId) return fail("Session invalide.");
  const text = (content ?? "").trim();
  if (!text) return fail("Votre note est vide.");
  if (text.length > 2000) return fail("Note trop longue.");

  const admin = createAdminClient();

  // 1) Client depuis le token + vérification du cookie de session portail.
  const { data: client } = await admin
    .from("clients")
    .select("id, workspace_id, first_name, last_name, company_name, portal_enabled, status")
    .eq("portal_token", token)
    .maybeSingle();
  if (!client || !client.portal_enabled || client.status !== "active") return fail("Session expirée. Rechargez la page.");

  const cookieValue = (await cookies()).get(portalCookieName(token))?.value;
  if (!verifyPortalSession(token, cookieValue, client.id)) return fail("Session expirée. Rechargez la page.");

  // 2) La prestation doit appartenir à CE client (portée stricte).
  const { data: service } = await admin
    .from("services")
    .select("id, service_type, scheduled_date")
    .eq("id", serviceId)
    .eq("client_id", client.id)
    .eq("workspace_id", client.workspace_id)
    .maybeSingle();
  if (!service) return fail("Prestation introuvable.");

  // 3) Insertion (service_role).
  const { error } = await admin.from("service_client_notes").insert({
    workspace_id: client.workspace_id,
    service_id: service.id,
    client_id: client.id,
    content: text,
    is_important: isImportant,
  });
  if (error) return fail("Enregistrement impossible.");

  // 4) Notification à l'équipe (admins) — l'info du client ne doit pas se perdre.
  await admin.from("notifications").insert({
    workspace_id: client.workspace_id,
    recipient_membership_id: null,
    type: isImportant ? "client_important_note" : "client_note",
    title: isImportant ? "Information importante du client" : "Nouvelle note du client",
    body: `${clientName(client)} : ${text.slice(0, 140)}`,
    entity_type: "service",
    entity_id: service.id,
    link: `/app/services/${service.id}`,
  });

  revalidatePath(`/portal/${token}/service/${serviceId}`);
  return ok(isImportant ? "Information importante transmise à l'équipe." : "Note transmise à l'équipe.");
}
