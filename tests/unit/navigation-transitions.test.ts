import { describe, expect, it } from "vitest";
import { routePathname } from "@/lib/navigation/transitions";

describe("Transitions de navigation LETI", () => {
  it("normalise les requêtes pour l'état actif du menu", () => {
    expect(routePathname("/app/services?date=2026-08-24#week")).toBe("/app/services");
  });
});
