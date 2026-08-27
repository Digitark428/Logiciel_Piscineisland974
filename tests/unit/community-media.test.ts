import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  COMMUNITY_IMAGE_LONGEST_SIDE,
  detectCommunityImageFormat,
  normalizeCommunityImage,
} from "@/lib/community-media";

function isoContainer(brand: string, compatible = brand): Buffer {
  return Buffer.concat([
    Buffer.from([0, 0, 0, 24]),
    Buffer.from("ftyp", "ascii"),
    Buffer.from(brand, "ascii"),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from(compatible, "ascii"),
  ]);
}

describe("Pipeline photo Entre nous", () => {
  it("détecte les formats depuis leurs octets, même sans extension ni MIME fiable", () => {
    expect(detectCommunityImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("jpeg");
    expect(detectCommunityImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(detectCommunityImageFormat(Buffer.from("RIFF0000WEBP", "ascii"))).toBe("webp");
    expect(detectCommunityImageFormat(isoContainer("heic", "mif1"))).toBe("heic");
    expect(detectCommunityImageFormat(isoContainer("mif1", "avif"))).toBe("avif");
    expect(detectCommunityImageFormat(Buffer.from("ceci n'est pas une image"))).toBeNull();
  });

  it("applique l'orientation EXIF avant de générer le média final", async () => {
    const portraitByExif = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "#f48b82" },
    }).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    const normalized = await normalizeCommunityImage(portraitByExif);
    const metadata = await sharp(normalized.buffer).metadata();
    expect(normalized.contentType).toBe("image/webp");
    expect(metadata.width).toBe(40);
    expect(metadata.height).toBe(80);
    expect(metadata.orientation).toBeUndefined();
  });

  it("réduit une photo lourde aux dimensions utiles sans l'agrandir", async () => {
    const largePng = await sharp({
      create: { width: 3200, height: 1800, channels: 3, background: "#5fc6e3" },
    }).png().toBuffer();
    const normalized = await normalizeCommunityImage(largePng);
    expect(Math.max(normalized.width, normalized.height)).toBe(COMMUNITY_IMAGE_LONGEST_SIDE);
    expect(normalized.buffer.length).toBeLessThan(5 * 1024 * 1024);
  });

  it("accepte AVIF et refuse un faux fichier image", async () => {
    const avif = await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#183a59" },
    }).avif({ quality: 70 }).toBuffer();
    await expect(normalizeCommunityImage(avif)).resolves.toMatchObject({ contentType: "image/webp", width: 64, height: 48 });
    await expect(normalizeCommunityImage(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]))).rejects.toThrow();
  });
});
