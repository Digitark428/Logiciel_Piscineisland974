export type NavigationDirection = "forward" | "back" | "neutral";

// Ordre visuel réel des destinations dans la navigation persistante. Les
// sous-routes héritent du rang de leur section, sauf les sous-menus dont
// l'ordre est lui-même visible à l'utilisateur.
const APP_ROUTE_ORDER = [
  "/app",
  "/app/services",
  "/app/planning",
  "/app/tasks/personal",
  "/app/tasks/assign",
  "/app/tasks/notes",
  "/app/community",
  "/app/map",
  "/app/clients",
  "/app/documents",
  "/app/team",
  "/app/backups",
  "/app/activity",
  "/app/settings",
  "/app/notifications",
] as const;

function pathnameOf(href: string): string {
  const pathname = href.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function routeOrder(pathname: string): number | null {
  if (pathname === "/app") return 0;

  for (let index = 1; index < APP_ROUTE_ORDER.length; index += 1) {
    const route = APP_ROUTE_ORDER[index];
    if (pathname === route || pathname.startsWith(`${route}/`)) return index;
  }

  // Les piscines sont ouvertes depuis les fiches clients et appartiennent au
  // même espace mental, même si leur route historique reste distincte.
  if (pathname === "/app/pools" || pathname.startsWith("/app/pools/")) {
    return APP_ROUTE_ORDER.indexOf("/app/clients");
  }

  return null;
}

/**
 * Déduit d'abord la relation parent/enfant, puis l'ordre réel des menus. Un
 * lien peut toujours fournir une intention explicite lorsque deux écrans liés
 * vivent dans des sections techniques différentes.
 */
export function navigationDirection(fromHref: string, toHref: string): NavigationDirection {
  const from = pathnameOf(fromHref);
  const to = pathnameOf(toHref);

  if (from === to) return "neutral";
  if (to.startsWith(`${from}/`)) return "forward";
  if (from.startsWith(`${to}/`)) return "back";

  const fromOrder = routeOrder(from);
  const toOrder = routeOrder(to);
  if (fromOrder !== null && toOrder !== null && fromOrder !== toOrder) {
    return toOrder > fromOrder ? "forward" : "back";
  }

  return "forward";
}

export function routePathname(href: string): string {
  return pathnameOf(href);
}
