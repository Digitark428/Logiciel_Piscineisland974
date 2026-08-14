import { describe, it, expect } from "vitest";
import {
  SUPPORT_CATEGORIES,
  CATEGORY_BY_KEY,
  SUPPORT_STATUSES,
  STATUS_BY_KEY,
  isSupportCategory,
  isSupportStatus,
} from "@/lib/assistance";

describe("Assistance — catégories", () => {
  it("expose les trois catégories obligatoires", () => {
    const keys = SUPPORT_CATEGORIES.map((c) => c.key);
    expect(keys).toEqual(["bug", "help", "suggestion"]);
  });

  it("adapte le texte du champ à chaque catégorie", () => {
    expect(CATEGORY_BY_KEY.bug.prompt).toBe("Décrivez votre bug");
    expect(CATEGORY_BY_KEY.help.prompt).toBe("Dites-nous comment nous pouvons vous aider");
    expect(CATEGORY_BY_KEY.suggestion.prompt).toBe("Quelle amélioration souhaitez-vous nous proposer ?");
  });

  it("distingue clairement bug / aide / suggestion (libellés Super Admin)", () => {
    expect(CATEGORY_BY_KEY.bug.label).toBe("Bug");
    expect(CATEGORY_BY_KEY.help.label).toBe("Aide");
    expect(CATEGORY_BY_KEY.suggestion.label).toBe("Suggestion");
  });

  it("valide les catégories via le garde-fou", () => {
    expect(isSupportCategory("bug")).toBe(true);
    expect(isSupportCategory("help")).toBe(true);
    expect(isSupportCategory("suggestion")).toBe(true);
    expect(isSupportCategory("autre")).toBe(false);
    expect(isSupportCategory(null)).toBe(false);
  });
});

describe("Assistance — statuts", () => {
  it("inclut les trois statuts obligatoires + fermé", () => {
    const keys = SUPPORT_STATUSES.map((s) => s.key);
    expect(keys).toContain("new");
    expect(keys).toContain("in_progress");
    expect(keys).toContain("resolved");
    expect(keys).toContain("closed");
  });

  it("associe un libellé lisible à chaque statut", () => {
    expect(STATUS_BY_KEY.new.label).toBe("Nouveau");
    expect(STATUS_BY_KEY.in_progress.label).toBe("En cours");
    expect(STATUS_BY_KEY.resolved.label).toBe("Résolu");
  });

  it("valide les statuts via le garde-fou", () => {
    expect(isSupportStatus("new")).toBe(true);
    expect(isSupportStatus("resolved")).toBe(true);
    expect(isSupportStatus("inconnu")).toBe(false);
  });
});
