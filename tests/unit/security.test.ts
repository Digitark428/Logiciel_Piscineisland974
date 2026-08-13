import { describe, it, expect } from "vitest";
import { hashPrivateCode, verifyPrivateCode, generatePortalToken } from "@/lib/utils/codes";
import { signPortalSession, verifyPortalSession, portalCookieName } from "@/lib/portal";

describe("Code privé client (hachage)", () => {
  it("ne stocke jamais le code en clair", () => {
    const stored = hashPrivateCode("4826");
    expect(stored).not.toContain("4826");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("vérifie le bon code et rejette les mauvais", () => {
    const stored = hashPrivateCode("secret-code");
    expect(verifyPrivateCode("secret-code", stored)).toBe(true);
    expect(verifyPrivateCode("mauvais", stored)).toBe(false);
    expect(verifyPrivateCode("secret-code", null)).toBe(false);
  });
});

describe("Token de portail", () => {
  it("génère des tokens uniques et suffisamment longs", () => {
    const a = generatePortalToken();
    const b = generatePortalToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(24);
  });
});

describe("Session de portail signée", () => {
  it("valide une session correcte et rejette la falsification", () => {
    const token = "tok_abc";
    const clientId = "11111111-1111-1111-1111-111111111111";
    const value = signPortalSession(token, clientId);
    expect(verifyPortalSession(token, value, clientId)).toBe(true);
    // Mauvais client
    expect(verifyPortalSession(token, value, "22222222-2222-2222-2222-222222222222")).toBe(false);
    // Signature altérée
    expect(verifyPortalSession(token, value.slice(0, -2) + "00", clientId)).toBe(false);
    // Autre token
    expect(verifyPortalSession("autre", value, clientId)).toBe(false);
  });

  it("génère un nom de cookie stable et opaque", () => {
    expect(portalCookieName("tok")).toBe(portalCookieName("tok"));
    expect(portalCookieName("tok")).not.toContain("tok");
  });
});
