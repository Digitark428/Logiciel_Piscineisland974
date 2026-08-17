import "server-only";

import crypto from "node:crypto";

function secret(): string {
  const value = process.env.PORTAL_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("PORTAL_SESSION_SECRET manquant.");
  return "development-only-portal-secret";
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
