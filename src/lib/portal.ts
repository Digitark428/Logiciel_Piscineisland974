import "server-only";

import crypto from "node:crypto";

function secret(): string {
  // Secret serveur pour signer les cookies de portail (jamais exposé au client).
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET ?? "insecure-dev-secret";
}

export function portalCookieName(token: string): string {
  return `pi_portal_${crypto.createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
}

/** Valeur de cookie signée : clientId + HMAC. */
export function signPortalSession(token: string, clientId: string): string {
  const hmac = crypto.createHmac("sha256", secret()).update(`${token}.${clientId}`).digest("hex");
  return `${clientId}.${hmac}`;
}

export function verifyPortalSession(token: string, cookieValue: string | undefined, clientId: string): boolean {
  if (!cookieValue) return false;
  const [id, mac] = cookieValue.split(".");
  if (id !== clientId || !mac) return false;
  const expected = crypto.createHmac("sha256", secret()).update(`${token}.${clientId}`).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
