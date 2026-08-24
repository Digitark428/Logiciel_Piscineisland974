export type NavigationDirection = "forward" | "back" | "neutral";

function pathnameOf(href: string): string {
  const pathname = href.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/**
 * Déduit uniquement les directions fiables : entrer dans une sous-route ou
 * revenir vers l'un de ses parents. Les changements de section vont vers
 * l'avant ; l'historique navigateur reste volontairement neutre.
 */
export function navigationDirection(fromHref: string, toHref: string): NavigationDirection {
  const from = pathnameOf(fromHref);
  const to = pathnameOf(toHref);

  if (from === to) return "neutral";
  if (to.startsWith(`${from}/`)) return "forward";
  if (from.startsWith(`${to}/`)) return "back";
  return "forward";
}

export function routePathname(href: string): string {
  return pathnameOf(href);
}
