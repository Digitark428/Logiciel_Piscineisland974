import "server-only";

import sharp, { type Sharp } from "sharp";

export const COMMUNITY_MAX_IMAGES = 4;
export const COMMUNITY_MAX_SOURCE_BYTES = 35 * 1024 * 1024;
export const COMMUNITY_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
export const COMMUNITY_MAX_INPUT_PIXELS = 80_000_000;
export const COMMUNITY_IMAGE_LONGEST_SIDE = 2048;

export type CommunityImageFormat = "avif" | "gif" | "heic" | "jpeg" | "png" | "webp";

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

/** Détecte le conteneur depuis ses octets, sans faire confiance au nom ni au MIME navigateur. */
export function detectCommunityImageFormat(buffer: Buffer): CommunityImageFormat | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return "gif";

  if (buffer.length >= 16 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brands = new Set<string>();
    for (let offset = 8; offset + 4 <= Math.min(buffer.length, 64); offset += 4) {
      brands.add(buffer.subarray(offset, offset + 4).toString("ascii"));
    }
    if ([...brands].some((brand) => AVIF_BRANDS.has(brand))) return "avif";
    if ([...brands].some((brand) => HEIF_BRANDS.has(brand))) return "heic";
  }

  return null;
}

type NormalizedCommunityImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
};

async function encodeForCommunity(input: Sharp): Promise<NormalizedCommunityImage> {
  const base = input
    .resize({
      width: COMMUNITY_IMAGE_LONGEST_SIDE,
      height: COMMUNITY_IMAGE_LONGEST_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    });

  let result = await base.clone().webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
  if (result.data.length > COMMUNITY_MAX_OUTPUT_BYTES) {
    result = await base.clone().webp({ quality: 74, effort: 5 }).toBuffer({ resolveWithObject: true });
  }
  if (!result.info.width || !result.info.height || result.data.length > COMMUNITY_MAX_OUTPUT_BYTES) {
    throw new Error("normalized-image-too-large");
  }

  return {
    buffer: result.data,
    contentType: "image/webp",
    extension: "webp",
    width: result.info.width,
    height: result.info.height,
  };
}

async function normalizeWithSharp(buffer: Buffer): Promise<NormalizedCommunityImage> {
  const image = sharp(buffer, {
    failOn: "error",
    limitInputPixels: COMMUNITY_MAX_INPUT_PIXELS,
    sequentialRead: true,
  }).autoOrient();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("invalid-image-dimensions");
  return encodeForCommunity(image);
}

async function normalizeHeicFallback(buffer: Buffer): Promise<NormalizedCommunityImage> {
  const heicDecoder = await import("heic-decode");
  const decode = heicDecoder.default;
  const decoded = await decode({ buffer });
  if (!decoded.width || !decoded.height || decoded.width * decoded.height > COMMUNITY_MAX_INPUT_PIXELS) {
    throw new Error("invalid-heic-dimensions");
  }
  const raw = Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
  return encodeForCommunity(sharp(raw, { raw: { width: decoded.width, height: decoded.height, channels: 4 } }));
}

/** Normalise les photos mobiles côté serveur et applique l'orientation EXIF avant encodage. */
export async function normalizeCommunityImage(buffer: Buffer): Promise<NormalizedCommunityImage> {
  if (buffer.length === 0 || buffer.length > COMMUNITY_MAX_SOURCE_BYTES) throw new Error("invalid-image-size");
  const format = detectCommunityImageFormat(buffer);
  if (!format) throw new Error("unsupported-image-format");

  try {
    return await normalizeWithSharp(buffer);
  } catch (error) {
    if (format !== "heic") throw error;
    return normalizeHeicFallback(buffer);
  }
}
