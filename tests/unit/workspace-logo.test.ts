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
    expect(metadata.width).toBe(WORKSPACE_LOGO_OUTPUT_WIDTH);
    expect(metadata.height).toBe(WORKSPACE_LOGO_OUTPUT_HEIGHT);
    const visible = await sharp(await sharp(logo.buffer).trim({ threshold: 10 }).toBuffer()).metadata();
    expect((visible.width ?? 1) / (visible.height ?? 1)).toBeCloseTo((width as number) / (height as number), 1);
  });

  it("conserve la transparence d’un PNG et accepte une image basse résolution", async () => {
    const source = await sharp({ create: { width: 48, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg width="30" height="20"><rect width="30" height="20" rx="3" fill="#183A59"/></svg>'), left: 9, top: 6 }])
      .png()
      .toBuffer();
    const logo = await normalizeWorkspaceLogo(source);
    const metadata = await sharp(logo.buffer).metadata();
    expect(logo.sourceFormat).toBe("png");
    expect(metadata.hasAlpha).toBe(true);
    expect(metadata.width).toBe(WORKSPACE_LOGO_OUTPUT_WIDTH);
    expect(metadata.height).toBe(WORKSPACE_LOGO_OUTPUT_HEIGHT);
  });

  it("accepte JPG/JPEG et limite les images très larges", async () => {
    const source = await sharp({
      create: { width: 3000, height: 400, channels: 3, background: "#f7f7f5" },
    }).jpeg({ quality: 90 }).toBuffer();
    const logo = await normalizeWorkspaceLogo(source);
    expect(logo.sourceFormat).toBe("jpeg");
    expect(logo.width).toBe(WORKSPACE_LOGO_OUTPUT_WIDTH);
    expect(logo.height).toBe(WORKSPACE_LOGO_OUTPUT_HEIGHT);
  });

  it("supprime de très grandes marges internes avant la mise au format", async () => {
    const source = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg width="400" height="200"><rect width="400" height="200" fill="#183A59"/></svg>'), left: 800, top: 400 }])
      .png()
      .toBuffer();
    const logo = await normalizeWorkspaceLogo(source);
    const visible = await sharp(await sharp(logo.buffer).trim({ threshold: 10 }).toBuffer()).metadata();
    expect((visible.width ?? 1) / (visible.height ?? 1)).toBeCloseTo(2, 1);
    expect(visible.width).toBeGreaterThan(900);
  });

  it("rejette un fichier incorrect", async () => {
    await expect(normalizeWorkspaceLogo(Buffer.from("pas une image"))).rejects.toThrow(/illisible|incorrect/i);
  });
});
