export const COMMUNITY_SEARCH_MAX_LENGTH = 80;

/** Normalise une recherche sans laisser passer de séparateurs de filtre PostgREST. */
export function normalizeCommunitySearch(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .slice(0, COMMUNITY_SEARCH_MAX_LENGTH)
    .trim();
}

export interface CommunityTextPart {
  kind: "text" | "hashtag";
  value: string;
}

/** Découpe le texte en conservant la ponctuation et les retours à la ligne. */
export function communityTextParts(value: string): CommunityTextPart[] {
  const parts: CommunityTextPart[] = [];
  const hashtag = /#[\p{L}\p{N}_-]+/gu;
  let cursor = 0;
  for (const match of value.matchAll(hashtag)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: "text", value: value.slice(cursor, index) });
    parts.push({ kind: "hashtag", value: match[0] });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) parts.push({ kind: "text", value: value.slice(cursor) });
  return parts;
}
