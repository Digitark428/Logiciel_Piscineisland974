import { describe, expect, it } from "vitest";
import { memberJobTitle } from "@/lib/utils/format";

describe("Poste des membres", () => {
  it("dissocie le poste métier du rôle de sécurité", () => {
    expect(memberJobTitle({ role: "member", job_title: "Technicien" })).toBe("Technicien");
  });

  it("affiche Gérant pour un administrateur sans poste historique", () => {
    expect(memberJobTitle({ role: "admin", job_title: null })).toBe("Gérant");
  });

  it("ne fabrique aucun poste pour un membre historique", () => {
    expect(memberJobTitle({ role: "member", job_title: null })).toBeNull();
  });
});
