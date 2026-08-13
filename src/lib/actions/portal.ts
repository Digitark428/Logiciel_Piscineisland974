"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPrivateCode } from "@/lib/utils/codes";
import { portalCookieName, signPortalSession } from "@/lib/portal";
import { fail, type ActionResult } from "@/lib/actions/result";

/** Ouvre l'espace client : valide le token + le code privé, pose un cookie de session. */
export async function openPortal(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!token || !code) return fail("Code requis.");

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, private_code_hash, portal_enabled, status")
    .eq("portal_token", token)
    .maybeSingle();

  if (!client || !client.portal_enabled || client.status !== "active") {
    return fail("Lien invalide ou accès désactivé.");
  }
  if (!verifyPrivateCode(code, client.private_code_hash)) {
    return fail("Code incorrect.");
  }

  cookies().set(portalCookieName(token), signPortalSession(token, client.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/portal/${token}`,
    maxAge: 60 * 60 * 8, // 8 h
  });

  redirect(`/portal/${token}`);
}

export async function closePortal(token: string): Promise<void> {
  cookies().delete(portalCookieName(token));
  redirect(`/portal/${token}`);
}
