import { describe, it, expect } from "vitest";
import { PERMISSION_KEYS, PERMISSION_GROUPS, DEFAULT_MEMBER_PERMISSIONS } from "@/lib/permissions";

describe("Permissions", () => {
  it("toutes les clés des groupes existent dans PERMISSION_KEYS", () => {
    for (const group of PERMISSION_GROUPS) {
      for (const item of group.items) {
        expect(PERMISSION_KEYS).toContain(item.key);
      }
    }
  });

  it("les permissions par défaut d'un membre sont valides", () => {
    for (const key of DEFAULT_MEMBER_PERMISSIONS) {
      expect(PERMISSION_KEYS).toContain(key);
    }
  });

  it("les clés de permission sont uniques", () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
  });

  it("le feed interne est consultable et publiable par défaut", () => {
    expect(DEFAULT_MEMBER_PERMISSIONS).toContain("community.view");
    expect(DEFAULT_MEMBER_PERMISSIONS).toContain("community.publish");
  });
});

// Réplique de la logique de `can()` (l'admin possède toutes les permissions).
function can(isAdmin: boolean, granted: Set<string>, key: string) {
  return isAdmin || granted.has(key);
}

describe("Logique d'autorisation applicative", () => {
  it("un admin a toutes les permissions", () => {
    const admin = { isAdmin: true, perms: new Set<string>() };
    for (const key of PERMISSION_KEYS) {
      expect(can(admin.isAdmin, admin.perms, key)).toBe(true);
    }
  });

  it("un membre est limité à ses permissions accordées", () => {
    const perms = new Set(["clients.view", "services.complete"]);
    expect(can(false, perms, "clients.view")).toBe(true);
    expect(can(false, perms, "clients.delete")).toBe(false);
    expect(can(false, perms, "team.manage")).toBe(false);
  });
});
