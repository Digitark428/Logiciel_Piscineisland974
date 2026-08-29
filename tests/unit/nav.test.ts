import { describe, expect, it } from "vitest";
import { ACCOUNT_NAV_ITEMS, filterNavEntries, isNavGroup, NAV_ITEMS } from "@/components/app/nav";

describe("Navigation applicative", () => {
  it("conserve Gestion dans le menu du compte et masque ses enfants non autorisés", () => {
    const entries = filterNavEntries(ACCOUNT_NAV_ITEMS, (item) => item.perm !== "team.manage" && !item.adminOnly);
    const management = entries.find((entry) => isNavGroup(entry) && entry.key === "management");
    expect(management && isNavGroup(management) ? management.children.map((item) => item.label) : []).toEqual(["Documents"]);
  });

  it("respecte l’ordre produit et masque les entrées retirées", () => {
    const labels = NAV_ITEMS.map((entry) => entry.label);
    expect(labels).toEqual([
      "Tableau de bord",
      "Mes clients",
      "Mes entretiens",
      "Planning",
      "Tâches & Notes",
      "Carte",
      "Entre nous",
      "Mes chantiers",
      "Mes dépannages",
      "LETI IA",
    ]);
    expect(labels).not.toContain("Gérer ma comptabilité");
  });

  it("place Paramètres après Gestion dans le menu du compte", () => {
    expect(ACCOUNT_NAV_ITEMS.map((entry) => entry.label)).toEqual(["Gestion", "Paramètres"]);
  });

  it("rend uniquement l’entrée existante LETI IA interactive pendant son développement", () => {
    const futureItems = NAV_ITEMS.filter((entry) => !isNavGroup(entry) && entry.development);
    const letiAi = futureItems.find((entry) => !isNavGroup(entry) && entry.href === "/app/leti-ia");

    expect(letiAi && !isNavGroup(letiAi) ? letiAi.interactiveDuringDevelopment : false).toBe(true);
    expect(
      futureItems
        .filter((entry) => !isNavGroup(entry) && entry.href !== "/app/leti-ia")
        .every((entry) => !isNavGroup(entry) && !entry.interactiveDuringDevelopment),
    ).toBe(true);
  });
});
