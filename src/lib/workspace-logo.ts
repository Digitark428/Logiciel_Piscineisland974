import "server-only";

import sharp, { type Metadata } from "sharp";

export const WORKSPACE_LOGO_MAX_SOURCE_BYTES = 4 * 1024 * 1024;
export const WORKSPACE_LOGO_MAX_PIXELS = 40_000_000;
export const WORKSPACE_LOGO_OUTPUT_WIDTH = 1440;
export const WORKSPACE_LOGO_OUTPUT_HEIGHT = 480;
const WORKSPACE_LOGO_TRIM_THRESHOLD = 14;

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

  let metadata: Metadata;
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
    const oriented = sharp(source, {
      density: 240,
      limitInputPixels: WORKSPACE_LOGO_MAX_PIXELS,
      failOn: "error",
    }).autoOrient();
    const trimmed = await oriented.clone()
      // Supprime les grands aplats transparents ou unis autour du visuel. Le
      // canevas 3:1 recréé ensuite garantit un rendu constant pour les logos
      // carrés, verticaux ou horizontaux sans jamais les déformer.
      .trim({ threshold: WORKSPACE_LOGO_TRIM_THRESHOLD })
      .toBuffer({ resolveWithObject: true });
    // Une image parfaitement uniforme est réduite à un pixel par trim(). Dans
    // ce cas, conserver la source évite de transformer un logo-aplat valide en
    // carré ; les véritables marges restent bien supprimées dans tous les autres cas.
    const sourceRatio = (metadata.width ?? 1) / (metadata.height ?? 1);
    const trimmedRatio = trimmed.info.width / trimmed.info.height;
    const ratioDivergence = Math.max(sourceRatio / trimmedRatio, trimmedRatio / sourceRatio);
    const trimKeepsSvgComposition = metadata.format !== "svg" || ratioDivergence < 2.5;
    const visual = trimmed.info.width > 1 && trimmed.info.height > 1 && trimKeepsSvgComposition
      ? sharp(trimmed.data)
      : oriented;
    const { data, info } = await visual
      .resize({
        width: WORKSPACE_LOGO_OUTPUT_WIDTH,
        height: WORKSPACE_LOGO_OUTPUT_HEIGHT,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
        withoutEnlargement: false,
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
