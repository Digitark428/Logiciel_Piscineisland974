import { describe, expect, it } from "vitest";
import {
  isTeamNoteResolved,
  teamNoteCommentLabel,
  teamNoteInteractionSummary,
} from "@/lib/team-notes";

describe("présentation des notes d’équipe", () => {
  it("ne considère la note comme traitée qu’après une exécution", () => {
    expect(isTeamNoteResolved(0)).toBe(false);
    expect(isTeamNoteResolved(1)).toBe(true);
    expect(isTeamNoteResolved(4)).toBe(true);
  });

  it("accorde correctement le compteur de commentaires", () => {
    expect(teamNoteCommentLabel(0)).toBe("Commenter");
    expect(teamNoteCommentLabel(1)).toBe("1 commentaire");
    expect(teamNoteCommentLabel(3)).toBe("3 commentaires");
  });

  it("résume seulement les interactions existantes", () => {
    expect(teamNoteInteractionSummary(0, 0)).toBe("");
    expect(teamNoteInteractionSummary(2, 0)).toBe("✓ Lu par 2");
    expect(teamNoteInteractionSummary(0, 1)).toBe("Fait par 1");
    expect(teamNoteInteractionSummary(3, 2)).toBe("✓ Lu par 3 · Fait par 2");
  });
});
