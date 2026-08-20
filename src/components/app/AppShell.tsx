"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { Icon } from "./icons";
import { signOut } from "@/lib/auth/actions";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils/cn";
import { WorkspaceIdentity } from "./WorkspaceIdentity";

function NavigationLinks({
  items,
  pathname,
  onNavigate,
  onPrefetch,
  onCancelPrefetch,
  pendingHref,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  onPrefetch: (href: string) => void;
  onCancelPrefetch: (href: string) => void;
  pendingHref: string | null;
}) {
  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const isPending = pendingHref === item.href;
        if (item.development) {
          const tone = item.developmentTone === "aqua" ? "aqua" : "coral";
          return (
            <div
              key={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-graphite-600 transition hover:bg-graphite-100 hover:text-graphite-900"
              aria-label={`${item.label} — En développement`}
            >
              <Icon name={item.icon} size={19} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate">{item.label}</span>
                {item.description && <span className="mt-0.5 block truncate text-[11px] font-normal text-graphite-500">{item.description}</span>}
                <span className={cn("leti-development-badge mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone === "aqua" && "leti-development-badge--aqua")}>En développement</span>
              </span>
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            // Les préchargements automatiques de tous les liens visibles provoquaient
            // une rafale de requêtes au chargement. Une intention de navigation claire
            // (survol ou focus maintenu) suffit pour préparer la destination utile.
            prefetch={false}
            onClick={(event) => onNavigate(item.href, event)}
            onPointerEnter={() => onPrefetch(item.href)}
            onPointerLeave={() => onCancelPrefetch(item.href)}
            onFocus={() => onPrefetch(item.href)}
            onBlur={() => onCancelPrefetch(item.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition",
              (active && !pendingHref) || isPending
                ? "border-coral-500 bg-pool-50 text-graphite-900"
                : "text-graphite-600 hover:bg-graphite-100 hover:text-graphite-900",
              isPending && "opacity-80",
            )}
          >
            <Icon name={item.icon} size={19} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  items,
  workspaceName,
  companyCode,
  userName,
  avatarUrl,
  roleLabel,
  notifCount,
  children,
}: {
  items: NavItem[];
  workspaceName: string;
  companyCode: string;
  userName: string;
  avatarUrl?: string | null;
  roleLabel: string;
  notifCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const prefetchedRoutes = useRef(new Set<string>());
  const queuedPrefetch = useRef<string | null>(null);
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Une destination n'est préchargée qu'après une intention brève et explicite.
  // Le dernier lien survolé gagne : déplacer le pointeur dans le menu ne lance pas
  // une requête pour chaque écran.
  const cancelPrefetch = useCallback((href: string) => {
    if (queuedPrefetch.current !== href) return;
    queuedPrefetch.current = null;
    if (prefetchTimer.current) {
      clearTimeout(prefetchTimer.current);
      prefetchTimer.current = null;
    }
  }, []);

  const prefetch = useCallback((href: string) => {
    if (href === pathname || prefetchedRoutes.current.has(href)) return;

    queuedPrefetch.current = href;
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);

    prefetchTimer.current = setTimeout(() => {
      const nextHref = queuedPrefetch.current;
      queuedPrefetch.current = null;
      prefetchTimer.current = null;
      if (!nextHref || prefetchedRoutes.current.has(nextHref)) return;

      prefetchedRoutes.current.add(nextHref);
      router.prefetch(nextHref);
    }, 120);
  }, [pathname, router]);

  useEffect(() => {
    // La navigation Next.js est déjà concurrente via Link ; cet état ne sert qu'à
    // donner un retour visuel immédiatement après le clic, avant le rendu suivant.
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => () => {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
  }, []);

  const navigate = useCallback((href: string, event: MouseEvent<HTMLAnchorElement>) => {
    // Ne pas fermer le menu ni afficher une transition pour un nouvel onglet / lien
    // modifié : le navigateur conserve alors son comportement natif.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    cancelPrefetch(href);
    if (href !== pathname) setPendingHref(href);
    closeMenu();
  }, [cancelPrefetch, closeMenu, pathname]);

  return (
    <div className="min-h-screen bg-graphite-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-graphite-200 bg-white lg:flex">
        <div className="flex h-[4.5rem] items-center px-5">
          <Link
            href="/app"
            prefetch={false}
            onClick={(event) => navigate("/app", event)}
            onPointerEnter={() => prefetch("/app")}
            onPointerLeave={() => cancelPrefetch("/app")}
            onFocus={() => prefetch("/app")}
            onBlur={() => cancelPrefetch("/app")}
          >
            <Logo symbolEffect="sidebar" />
          </Link>
        </div>
        <div className="px-5 pb-3">
          <WorkspaceIdentity name={workspaceName} companyCode={companyCode} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavigationLinks
            items={items}
            pathname={pathname}
            onNavigate={navigate}
            onPrefetch={prefetch}
            onCancelPrefetch={cancelPrefetch}
            pendingHref={pendingHref}
          />
        </div>
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-graphite-950/25" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-float">
            <div className="flex h-[4.5rem] items-center justify-between px-5">
              <Logo symbolEffect="sidebar" />
              <button onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Fermer">✕</button>
            </div>
            <div className="px-5 pb-3">
              <WorkspaceIdentity name={workspaceName} companyCode={companyCode} />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <NavigationLinks
                items={items}
                pathname={pathname}
                onNavigate={navigate}
                onPrefetch={prefetch}
                onCancelPrefetch={cancelPrefetch}
                pendingHref={pendingHref}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Contenu */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center gap-3 border-b border-graphite-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="btn-ghost p-2 lg:hidden" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/app/notifications"
              prefetch={false}
              onClick={(event) => navigate("/app/notifications", event)}
              onPointerEnter={() => prefetch("/app/notifications")}
              onPointerLeave={() => cancelPrefetch("/app/notifications")}
              onFocus={() => prefetch("/app/notifications")}
              onBlur={() => cancelPrefetch("/app/notifications")}
              className="relative inline-flex h-10 w-10 shrink-0 overflow-visible btn-ghost p-2"
              aria-label={notifCount > 0 ? `Notifications (${notifCount > 99 ? "99+" : notifCount} non lues)` : "Notifications"}
            >
              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", notifCount > 0 && "leti-notification-bell")}><Icon name="bell" size={21} /></span>
              {notifCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-500 px-1.5 text-[11px] font-bold leading-none text-graphite-900 ring-2 ring-white">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 rounded-xl px-2 py-1">
              <Avatar name={userName} src={avatarUrl} size={34} />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold leading-tight text-graphite-900">{userName}</div>
                <div className="text-xs leading-tight text-graphite-400">{roleLabel}</div>
              </div>
            </div>
            <form action={signOut}>
              <button type="submit" className="btn-ghost p-2" aria-label="Se déconnecter" title="Se déconnecter">
                <Icon name="logout" size={20} />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
