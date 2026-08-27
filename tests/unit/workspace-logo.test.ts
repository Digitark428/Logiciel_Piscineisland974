import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  normalizeWorkspaceLogo,
  WORKSPACE_LOGO_OUTPUT_HEIGHT,
  WORKSPACE_LOGO_OUTPUT_WIDTH,
} from "@/lib/workspace-logo";

function svg(width: number, height: number) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#183A59"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#78D8EC"/></svg>`);
}

describe("Logo d’entreprise", () => {
  it.each([
    ["horizontal", 1200, 240],
    ["carré", 400, 400],
    ["vertical", 220, 900],
  ])("normalise un SVG %s sans déformer son ratio", async (_label, width, height) => {
    const logo = await normalizeWorkspaceLogo(svg(width as number, height as number));
    const metadata = await sharp(logo.buffer).metadata();
    expect(logo.sourceFormat).toBe("svg");
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(WORKSPACE_LOGO_OUTPUT_WIDTH);
    expect(metadata.height).toBeLessThanOrEqual(WORKSPACE_LOGO_OUTPUT_HEIGHT);
    expect((metadata.width ?? 1) / (metadata.height ?? 1)).toBeCloseTo((width as number) / (height as number), 1);
  });

  it("conserve la transparence d’un PNG et accepte une image basse résolution", async () => {
    const source = await sharp({
      create: { width: 48, height: 32, channels: 4, background: { r: 24, g: 58, b: 89, alpha: 0.35 } },
    }).png().toBuffer();
    const logo = await normalizeWorkspaceLogo(source);
    const metadata = await sharp(logo.buffer).metadata();
    expect(logo.sourceFormat).toBe("png");
    expect(metadata.hasAlpha).toBe(true);
    expect(metadata.width).toBe(48);
  });

  it("accepte JPG/JPEG et limite les images très larges", async () => {
    const source = await sharp({
      create: { width: 3000, height: 400, channels: 3, background: "#f7f7f5" },
    }).jpeg({ quality: 90 }).toBuffer();
    const logo = await normalizeWorkspaceLogo(source);
    expect(logo.sourceFormat).toBe("jpeg");
    expect(logo.width).toBeLessThanOrEqual(WORKSPACE_LOGO_OUTPUT_WIDTH);
    expect(logo.height).toBeLessThanOrEqual(WORKSPACE_LOGO_OUTPUT_HEIGHT);
  });

  it("rejette un fichier incorrect", async () => {
    await expect(normalizeWorkspaceLogo(Buffer.from("pas une image"))).rejects.toThrow(/illisible|incorrect/i);
  });
});
