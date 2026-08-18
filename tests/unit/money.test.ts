import { describe, expect, it } from "vitest";
import { formatMoneyCents, moneyCentsInputValue, parseMoneyToCents } from "@/lib/utils/money";

describe("Montants financiers", () => {
  it("convertit une saisie française en centimes sans flottant", () => {
    expect(parseMoneyToCents("200")).toBe(20000);
    expect(parseMoneyToCents("1 250,50")).toBe(125050);
    expect(parseMoneyToCents("850.25 €")).toBe(85025);
  });

  it("rejette les montants ambigus ou hors plage", () => {
    expect(parseMoneyToCents("12,345")).toBeNull();
    expect(parseMoneyToCents("-20")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
  });

  it("affiche les euros français sans décimales inutiles", () => {
    expect(formatMoneyCents(124500)).toBe("1\u202f245 €");
    expect(formatMoneyCents(125050)).toBe("1\u202f250,50 €");
    expect(moneyCentsInputValue(125050)).toBe("1250,50");
  });
});
