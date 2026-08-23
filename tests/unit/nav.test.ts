import { describe, expect, it } from "vitest";
import { filterNavEntries, isNavGroup, NAV_ITEMS } from "@/components/app/nav";

describe("Navigation applicative", () => {
  it("conserve les groupes et masque leurs enfants non autorisés", () => {
    const entries = filterNavEntries(NAV_ITEMS, (item) => item.perm !== "team.manage" && !item.adminOnly);
    const management = entries.find((entry) => isNavGroup(entry) && entry.key === "management");
    expect(management && isNavGroup(management) ? management.children.map((item) => item.label) : []).toEqual(["Documents", "Sauvegardes"]);
  });

  it("place les quatre fonctions futures juste avant Paramètres", () => {
    const labels = NAV_ITEMS.map((entry) => entry.label);
    expect(labels.slice(-5)).toEqual(["Mes chantiers", "Mes dépannages", "Gérer ma comptabilité", "LETI IA", "Paramètres"]);
  });
});
