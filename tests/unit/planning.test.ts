import { describe, it, expect } from "vitest";
import { startOfWeek, rangeFor, toISO, addDays, navFor } from "@/app/app/planning/planning-utils";

describe("Planning — calcul des périodes", () => {
  it("startOfWeek renvoie un lundi", () => {
    const wed = new Date("2026-08-12T00:00:00"); // mercredi
    const monday = startOfWeek(wed);
    expect(monday.getDay()).toBe(1); // lundi
    expect(toISO(monday)).toBe("2026-08-10");
  });

  it("range semaine couvre 7 jours", () => {
    const anchor = new Date("2026-08-12T00:00:00");
    const { start, end } = rangeFor("week", anchor);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(6);
  });

  it("range mois couvre le mois entier", () => {
    const anchor = new Date("2026-02-15T00:00:00");
    const { start, end } = rangeFor("month", anchor);
    expect(toISO(start)).toBe("2026-02-01");
    expect(toISO(end)).toBe("2026-02-28");
  });

  it("navigation semaine avance de 7 jours", () => {
    const anchor = new Date("2026-08-12T00:00:00");
    expect(toISO(navFor("week", anchor, 1))).toBe(toISO(addDays(anchor, 7)));
    expect(toISO(navFor("week", anchor, -1))).toBe(toISO(addDays(anchor, -7)));
  });
});
