import { describe, expect, it } from "vitest";
import { communityTextParts, normalizeCommunitySearch } from "@/lib/community-search";

describe("Recherche Entre nous", () => {
  it("normalise un hashtag et neutralise les séparateurs de filtre", () => {
    expect(normalizeCommunitySearch("  ##Installation,or(id.eq.x)  ")).toBe("Installation or id eq x");
  });

  it("rend les hashtags identifiables sans perdre le texte", () => {
    const parts = communityTextParts("Belle #installation à #Saint-Paul !");
    expect(parts.filter((part) => part.kind === "hashtag").map((part) => part.value)).toEqual(["#installation", "#Saint-Paul"]);
    expect(parts.map((part) => part.value).join("")).toBe("Belle #installation à #Saint-Paul !");
  });
});
