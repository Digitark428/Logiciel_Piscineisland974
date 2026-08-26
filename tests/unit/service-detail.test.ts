import { describe, expect, it } from "vitest";
import { serviceDetailEditAction } from "@/lib/services/detail";

describe("serviceDetailEditAction", () => {
  it("conserve la route d'édition d'un entretien ponctuel", () => {
    expect(serviceDetailEditAction({
      canEdit: true,
      serviceId: "service-1",
      weeklyContract: false,
    })).toEqual({
      href: "/app/services/service-1/edit",
      label: "Modifier l'entretien",
    });
  });

  it("ouvre le contrat pour toutes les occurrences hebdomadaires", () => {
    expect(serviceDetailEditAction({
      canEdit: true,
      serviceId: "service-1",
      seriesId: "series-1",
      weeklyContract: true,
    })).toEqual({
      href: "/app/services/contracts/series-1",
      label: "Modifier le contrat",
    });

    expect(serviceDetailEditAction({
      canEdit: true,
      seriesId: "series-1",
      weeklyContract: true,
    })).toEqual({
      href: "/app/services/contracts/series-1",
      label: "Modifier le contrat",
    });
  });

  it("masque l'action sans permission d'édition", () => {
    expect(serviceDetailEditAction({
      canEdit: false,
      serviceId: "service-1",
      seriesId: "series-1",
      weeklyContract: true,
    })).toBeUndefined();
  });
});
