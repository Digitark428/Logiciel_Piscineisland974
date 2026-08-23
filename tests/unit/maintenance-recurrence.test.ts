import { describe, expect, it } from "vitest";
import { addCalendarDays, isoWeekday, weeklyDatesInRange, weeklyOccurrenceKey } from "@/lib/services/recurrence";

describe("Contrats d'entretien hebdomadaires", () => {
  it("calcule uniquement le jour ISO choisi dans une plage", () => {
    expect(weeklyDatesInRange({ starts_on: "2026-08-01", ends_on: null, recurrence_weekday: 3 }, "2026-08-01", "2026-08-31"))
      .toEqual(["2026-08-05", "2026-08-12", "2026-08-19", "2026-08-26"]);
  });

  it("respecte les bornes du contrat sans générer une année de lignes", () => {
    expect(weeklyDatesInRange({ starts_on: "2026-08-10", ends_on: "2026-08-24", recurrence_weekday: 1 }, "2026-08-01", "2026-09-30"))
      .toEqual(["2026-08-10", "2026-08-17", "2026-08-24"]);
  });

  it("gère le dimanche comme jour ISO 7", () => {
    expect(isoWeekday(new Date("2026-08-23T00:00:00Z"))).toBe(7);
    expect(weeklyDatesInRange({ starts_on: "2026-08-23", ends_on: null, recurrence_weekday: 7 }, "2026-08-23", "2026-08-30"))
      .toEqual(["2026-08-23", "2026-08-30"]);
  });

  it("rejette une règle ou une plage invalide", () => {
    expect(weeklyDatesInRange({ starts_on: "2026-08-01", ends_on: null, recurrence_weekday: 0 }, "2026-08-01", "2026-08-31")).toEqual([]);
    expect(weeklyDatesInRange({ starts_on: "2026-08-01", ends_on: null, recurrence_weekday: 1 }, "2026-09-01", "2026-08-01")).toEqual([]);
  });

  it("produit des clés d'occurrence stables et navigue sur les dates civiles", () => {
    expect(weeklyOccurrenceKey("contrat", "2026-08-24")).toBe("contrat:2026-08-24");
    expect(addCalendarDays("2026-08-31", 1)).toBe("2026-09-01");
  });
});
