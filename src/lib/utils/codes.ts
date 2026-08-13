import "server-only";

import crypto from "node:crypto";

/** Token de portail client : URL-safe, imprévisible, révocable (regénérable). */
export function generatePortalToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Hash d'un code privé client (scrypt + sel). Jamais stocké en clair. */
export function hashPrivateCode(code: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(code.normalize("NFKC"), salt, 32);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPrivateCode(code: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const derived = crypto.scryptSync(code.normalize("NFKC"), salt, 32);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}
