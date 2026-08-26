function pathnameOf(href: string): string {
  const pathname = href.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function routePathname(href: string): string {
  return pathnameOf(href);
}
