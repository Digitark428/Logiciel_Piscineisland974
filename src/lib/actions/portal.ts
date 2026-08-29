"use server";

import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPrivateCode } from "@/lib/utils/codes";
import { portalCookieName, signPortalSession } from "@/lib/portal";
import { fail, type ActionResult } from "@/lib/actions/result";

/** Ouvre l'espace client : valide le token + le code privé, pose un cookie de session. */
export async function openPortal(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!token || !code) return fail("Accès impossible.");

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = requestHeaders.get("user-agent") ?? "unknown";
  const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
  const tokenHash = hash(token);
  const ipHash = hash(ip);
  const userAgentHash = hash(userAgent);

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, private_code_hash, portal_enabled, status")
    .eq("portal_token", token)
    .maybeSingle();

  const { data: locked } = await admin.rpc("portal_auth_is_locked", { p_token_hash: tokenHash, p_ip_hash: ipHash, p_user_agent_hash: userAgentHash });
  if (locked) return fail("Accès impossible. Réessayez plus tard.");
  if (!client || !client.portal_enabled || client.status !== "active" || !verifyPrivateCode(code, client.private_code_hash)) {
    await admin.rpc("record_portal_auth_attempt", { p_token_hash: tokenHash, p_ip_hash: ipHash, p_user_agent_hash: userAgentHash, p_success: false });
    return fail("Accès impossible.");
  }
  await admin.rpc("record_portal_auth_attempt", { p_token_hash: tokenHash, p_ip_hash: ipHash, p_user_agent_hash: userAgentHash, p_success: true });

  (await cookies()).set(portalCookieName(token), signPortalSession(token, client.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/portal/${token}`,
    maxAge: 60 * 60 * 8, // 8 h
  });

  redirect(`/portal/${token}`);
}

export async function closePortal(token: string): Promise<void> {
  (await cookies()).delete(portalCookieName(token));
  redirect(`/portal/${token}`);
}
