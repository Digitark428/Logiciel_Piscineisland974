import { describe, expect, it } from "vitest";
import { navigationDirection, routePathname } from "@/lib/navigation/transitions";

describe("Transitions de navigation LETI", () => {
  it("entre vers l'avant d'une liste vers une fiche", () => {
    expect(navigationDirection("/app/clients", "/app/clients/client-1")).toBe("forward");
    expect(navigationDirection("/app/services", "/app/services/service-1")).toBe("forward");
  });

  it("revient vers l'arrière d'une fiche vers sa liste", () => {
    expect(navigationDirection("/app/clients/client-1", "/app/clients")).toBe("back");
    expect(navigationDirection("/app/services/service-1", "/app/services")).toBe("back");
  });

  it("reste neutre quand seule la requête change", () => {
    expect(navigationDirection("/app/planning?date=2026-08-24", "/app/planning?date=2026-08-25")).toBe("neutral");
  });

  it("normalise les requêtes pour l'état actif du menu", () => {
    expect(routePathname("/app/services?date=2026-08-24#week")).toBe("/app/services");
  });
});
