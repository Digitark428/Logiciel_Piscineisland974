import { describe, it, expect } from "vitest";
import { startOfWeek, rangeFor, toISO, addDays, navFor, parseAnchor, weekdayShort } from "@/app/app/planning/planning-utils";
import { dateOnlyToUtcDate } from "@/lib/utils/date";

describe("Planning — calcul des périodes", () => {
  it("startOfWeek renvoie un lundi", () => {
    const wed = parseAnchor("2026-08-12"); // mercredi
    const monday = startOfWeek(wed);
    expect(weekdayShort(monday)).toBe("lun");
    expect(toISO(monday)).toBe("2026-08-10");
  });

  it("range semaine couvre 7 jours", () => {
    const anchor = parseAnchor("2026-08-12");
    const { start, end } = rangeFor("week", anchor);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(6);
  });

  it("range mois couvre le mois entier", () => {
    const anchor = parseAnchor("2026-02-15");
    const { start, end } = rangeFor("month", anchor);
    expect(toISO(start)).toBe("2026-02-01");
    expect(toISO(end)).toBe("2026-02-28");
  });

  it("navigation semaine avance de 7 jours", () => {
    const anchor = parseAnchor("2026-08-12");
    expect(toISO(navFor("week", anchor, 1))).toBe(toISO(addDays(anchor, 7)));
    expect(toISO(navFor("week", anchor, -1))).toBe(toISO(addDays(anchor, -7)));
  });

  it("conserve le jour réunionnais après minuit", () => {
    // 00:00 le 12 août à La Réunion correspond à 20:00 UTC la veille.
    expect(toISO(new Date("2026-08-11T20:00:00.000Z"))).toBe("2026-08-12");
  });

  it("rejette une date civile invalide", () => {
    expect(dateOnlyToUtcDate("2026-02-30")).toBeNull();
  });
});
