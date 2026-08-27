import "server-only";

import sharp from "sharp";

export const WORKSPACE_LOGO_MAX_SOURCE_BYTES = 4 * 1024 * 1024;
export const WORKSPACE_LOGO_MAX_PIXELS = 40_000_000;
export const WORKSPACE_LOGO_OUTPUT_WIDTH = 1440;
export const WORKSPACE_LOGO_OUTPUT_HEIGHT = 480;

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "svg"]);

export interface NormalizedWorkspaceLogo {
  buffer: Buffer;
  width: number;
  height: number;
  sourceFormat: string;
}

export function workspaceLogoPath(settings: Record<string, unknown> | null | undefined): string | null {
  const value = settings?.company_logo_path;
  return typeof value === "string" && value.trim() ? value : null;
}

export async function normalizeWorkspaceLogo(source: Buffer): Promise<NormalizedWorkspaceLogo> {
  if (source.length === 0) throw new Error("Le fichier est vide.");
  if (source.length > WORKSPACE_LOGO_MAX_SOURCE_BYTES) throw new Error("Le logo dépasse la limite de 4 Mo.");

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(source, {
      density: 240,
      limitInputPixels: WORKSPACE_LOGO_MAX_PIXELS,
      failOn: "error",
    }).metadata();
  } catch {
    throw new Error("Le fichier image est illisible ou incorrect.");
  }

  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new Error("Format non pris en charge. Utilisez un SVG, PNG, JPG ou JPEG.");
  }

  try {
    const { data, info } = await sharp(source, {
      density: 240,
      limitInputPixels: WORKSPACE_LOGO_MAX_PIXELS,
      failOn: "error",
    })
      .autoOrient()
      .resize({
        width: WORKSPACE_LOGO_OUTPUT_WIDTH,
        height: WORKSPACE_LOGO_OUTPUT_HEIGHT,
        fit: "inside",
        withoutEnlargement: metadata.format !== "svg",
      })
      .webp({ quality: 90, alphaQuality: 100, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: info.width,
      height: info.height,
      sourceFormat: metadata.format,
    };
  } catch {
    throw new Error("Le logo n’a pas pu être optimisé.");
  }
}
