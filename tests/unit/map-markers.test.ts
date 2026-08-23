import { describe, expect, it } from "vitest";
import { mapMarkerHtml, mapPopupHtml } from "@/app/app/map/map-markers";

const base = {
  href: "/app/services/1",
  code: "ENT-1",
  client: "Jean PAYET",
  serviceType: "Entretien piscine",
  date: "23 août 2026",
  time: "08:00",
  status: "planned" as const,
  assigneeId: "member-a",
  assignee: "Léa Hoarau",
  assigneeShortName: "Léa",
  assigneeJobTitle: "Technicienne piscine",
  assigneeAvatarUrl: null,
};

describe("Repères de carte", () => {
  it("empile les intervenants distincts d'une même adresse", () => {
    const html = mapMarkerHtml([base, { ...base, assigneeId: "member-b", assignee: "Noé Payet", assigneeShortName: "Noé" }]);
    expect(html).toContain("2 intervenants");
    expect(html).toContain("LH");
    expect(html).toContain("NP");
  });

  it("affiche un repère neutre non assigné et échappe le popup", () => {
    const unassigned = { ...base, assigneeId: null, assignee: "", assigneeShortName: "", assigneeJobTitle: "" };
    expect(mapMarkerHtml([unassigned])).toContain("Non assigné");
    const popup = mapPopupHtml({ lat: -21, lng: 55, client: "<Client>", address: "Rue & mer", services: [unassigned] });
    expect(popup).toContain("&lt;Client&gt;");
    expect(popup).toContain("Rue &amp; mer");
    expect(popup).toContain("Non assigné");
  });
});
