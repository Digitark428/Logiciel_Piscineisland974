import { describe, expect, it } from "vitest";
import { appearanceSchema, defaults, normalizeAppearance, themeStyle } from "@/lib/appearance/theme";

describe("personal appearance", () => {
  it("falls back safely when stored data is malformed or from an unknown version", () => {
    expect(normalizeAppearance({ ...defaults, version: 2 })).toEqual(defaults);
    expect(normalizeAppearance({ ...defaults, primary: "url(evil)" })).toEqual(defaults);
  });
  it("limits settings and preserves independent section overrides", () => {
    expect(appearanceSchema.safeParse({ ...defaults, blur: 100 }).success).toBe(false);
    const custom = { ...defaults, opacity: 0, cards: { clients: { color: "#f48b82", opacity: 0 } } };
    const style = themeStyle(appearanceSchema.parse(custom)) as Record<string, string>;
    expect(style["--glass-opacity"]).toBe("0.86");
    expect(style["--glass-clients-opacity"]).toBe("0.86");
    expect(style["--glass-services-color"]).toBeUndefined();
  });
});
