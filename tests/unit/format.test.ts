import { describe, it, expect } from "vitest";
import { clientName, memberName, initials, formatMoney, formatDateWithWeekday, operationalClientName } from "@/lib/utils/format";

describe("Formatage", () => {
  it("clientName privilégie l'entreprise puis le nom", () => {
    expect(clientName({ company_name: "ACME", first_name: "Jean", last_name: "Payet" })).toBe("ACME");
    expect(clientName({ company_name: null, first_name: "Jean", last_name: "Payet" })).toBe("Jean Payet");
    expect(clientName({ company_name: null, first_name: null, last_name: null })).toBe("Client sans nom");
  });

  it("memberName retombe sur l'e-mail si pas de nom", () => {
    expect(memberName({ first_name: null, last_name: null, email: "a@b.re" })).toBe("a@b.re");
    expect(memberName({ first_name: "Léa", last_name: "Hoarau", email: "x@y.re" })).toBe("Léa Hoarau");
  });

  it("initials prend deux lettres max", () => {
    expect(initials("Jean Payet")).toBe("JP");
    expect(initials("Sophie")).toBe("S");
  });

  it("formatMoney formate en euros", () => {
    const s = formatMoney(120);
    expect(s).toContain("120");
    expect(s).toMatch(/€/);
  });

  it("rend le nom opérationnel sous la forme Prénom NOM", () => {
    expect(operationalClientName({ company_name: "ACME", first_name: "jEAN", last_name: "pAyEt" })).toBe("Jean PAYET");
    expect(operationalClientName({ company_name: "Piscines Ouest", first_name: null, last_name: null })).toBe("Piscines Ouest");
  });

  it("ajoute le jour de la semaine sans décalage de fuseau", () => {
    expect(formatDateWithWeekday("2026-08-23")).toBe("Dimanche 23 août");
  });
});
