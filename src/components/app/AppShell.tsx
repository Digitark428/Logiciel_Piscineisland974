"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { Icon } from "./icons";
import { AdaptiveRouteTransition } from "./AdaptiveRouteTransition";
import { signOut } from "@/lib/auth/actions";
import { isNavGroup, type NavEntry, type NavItem } from "./nav";
import { cn } from "@/lib/utils/cn";
import { WorkspaceIdentity } from "./WorkspaceIdentity";
import { navigationDirection, routePathname, type NavigationDirection } from "@/lib/navigation/transitions";

function NavigationLinks({
  items,
  pathname,
  onNavigate,
  onPrefetch,
  onCancelPrefetch,
  pendingHref,
}: {
  items: NavEntry[];
  pathname: string;
  onNavigate: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  onPrefetch: (href: string, immediate?: boolean) => void;
  onCancelPrefetch: (href: string) => void;
  pendingHref: string | null;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(
    items.filter(isNavGroup).map((group) => [group.key, group.children.some((item) => pathname.startsWith(item.href))]),
  ));

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = { ...current };
      for (const entry of items) {
        if (isNavGroup(entry) && entry.children.some((item) => pathname.startsWith(item.href))) next[entry.key] = true;
      }
      return next;
    });
  }, [items, pathname]);

  const renderItem = (item: NavItem, nested = false) => {
    const active = item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const isPending = pendingHref === item.href;
    if (item.development) {
      const tone = item.developmentTone === "aqua" ? "aqua" : "coral";
      return (
        <div
          key={item.href}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-graphite-600"
          aria-label={`${item.label} — En développement`}
        >
          <Icon name={item.icon} size={19} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{item.label}</span>
            {item.description && <span className="mt-0.5 block truncate text-[11px] font-normal text-graphite-500">{item.description}</span>}
            <span className={cn("leti-development-badge mt-1 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone === "aqua" && "leti-development-badge--aqua")}>En développement</span>
          </span>
        </div>
      );
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={(event) => onNavigate(item.href, event)}
        onPointerEnter={() => onPrefetch(item.href)}
        onPointerLeave={() => onCancelPrefetch(item.href)}
        onTouchStart={() => onPrefetch(item.href, true)}
        onFocus={() => onPrefetch(item.href)}
        onBlur={() => onCancelPrefetch(item.href)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition",
          nested && "ml-3 pl-4 text-[13px]",
          (active && !pendingHref) || isPending
            ? "border-coral-500 bg-pool-50 text-graphite-900"
            : "text-graphite-600 hover:bg-graphite-100 hover:text-graphite-900",
          isPending && "opacity-80",
        )}
      >
        <Icon name={item.icon} size={nested ? 17 : 19} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="space-y-1.5">
      {items.map((entry) => {
        if (!isNavGroup(entry)) return renderItem(entry);
        const expanded = expandedGroups[entry.key] ?? false;
        const active = entry.children.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <div key={entry.key}>
            <button
              type="button"
              onClick={() => setExpandedGroups((current) => ({ ...current, [entry.key]: !expanded }))}
              aria-expanded={expanded}
              aria-controls={`nav-group-${entry.key}`}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                active || expanded ? "bg-graphite-50 text-graphite-900" : "text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900",
              )}
            >
              <Icon name={entry.icon} size={19} />
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              <span aria-hidden className={cn("text-xs transition-transform", expanded && "rotate-180")}>⌄</span>
            </button>
            {expanded && (
              <div id={`nav-group-${entry.key}`} className="ml-2 mt-1 space-y-1 rounded-xl border border-graphite-100 bg-graphite-50 p-1.5">
                {entry.children.map((item) => renderItem(item, true))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function ProfileMenu({
  accountItems,
  profileHref,
  userName,
  avatarUrl,
  roleLabel,
  pathname,
  pendingHref,
  onNavigate,
  onPrefetch,
  onCancelPrefetch,
}: {
  accountItems: NavEntry[];
  profileHref: string | null;
  userName: string;
  avatarUrl?: string | null;
  roleLabel: string;
  pathname: string;
  pendingHref: string | null;
  onNavigate: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  onPrefetch: (href: string, immediate?: boolean) => void;
  onCancelPrefetch: (href: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const closeMenu = useCallback(() => {
    setOpen(false);
    setExpandedGroups({});
  }, []);

  useEffect(() => {
    closeMenu();
  }, [closeMenu, pathname]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  const renderLink = (item: NavItem, nested = false) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const isPending = pendingHref === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={(event) => {
          closeMenu();
          onNavigate(item.href, event);
        }}
        onPointerEnter={() => onPrefetch(item.href)}
        onPointerLeave={() => onCancelPrefetch(item.href)}
        onTouchStart={() => onPrefetch(item.href, true)}
        onFocus={() => onPrefetch(item.href)}
        onBlur={() => onCancelPrefetch(item.href)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition",
          nested && "text-[13px] text-graphite-500",
          (active && !pendingHref) || isPending
            ? "border-coral-500 bg-pool-50 text-graphite-900"
            : "text-graphite-600 hover:bg-white hover:text-graphite-900",
          isPending && "opacity-80",
        )}
      >
        <Icon name={item.icon} size={nested ? 17 : 19} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) closeMenu();
          else {
            setExpandedGroups({});
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-controls="leti-profile-menu"
        aria-label={`${open ? "Fermer" : "Ouvrir"} le menu du profil de ${userName}`}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl px-2 py-1 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 focus-visible:ring-offset-2",
          open ? "bg-graphite-50" : "hover:bg-graphite-50",
        )}
      >
        <Avatar name={userName} src={avatarUrl} size={34} />
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold leading-tight text-graphite-900">{userName}</span>
          <span className="block text-xs leading-tight text-graphite-400">{roleLabel}</span>
        </span>
        <span aria-hidden className={cn("hidden text-xs text-graphite-400 transition-transform sm:inline", open && "rotate-180")}>⌄</span>
      </button>

      {open && (
        <nav
          id="leti-profile-menu"
          aria-label="Menu du profil"
          className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-graphite-100 bg-white p-2 shadow-float"
        >
          <div className="mb-2 border-b border-graphite-100 px-3 py-2 sm:hidden">
            <div className="truncate text-sm font-semibold text-graphite-900">{userName}</div>
            <div className="truncate text-xs text-graphite-400">{roleLabel}</div>
          </div>

          {profileHref && renderLink({ href: profileHref, label: "Modifier mon profil", icon: "users" })}

          {accountItems.map((entry) => {
            if (!isNavGroup(entry)) return renderLink(entry);
            const expanded = expandedGroups[entry.key] ?? false;
            return (
              <div key={entry.key} className="mt-1">
                <button
                  type="button"
                  onClick={() => setExpandedGroups((current) => ({ ...current, [entry.key]: !expanded }))}
                  aria-expanded={expanded}
                  aria-controls={`profile-group-${entry.key}`}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                    expanded ? "bg-graphite-50 text-graphite-900" : "text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900",
                  )}
                >
                  <Icon name={entry.icon} size={19} />
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={cn("h-[18px] w-[18px] shrink-0 transition-transform", expanded && "rotate-180")}
                  >
                    <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {expanded && (
                  <div id={`profile-group-${entry.key}`} className="ml-2 mt-1 space-y-1 rounded-xl border border-graphite-100 bg-graphite-50 p-1.5">
                    {entry.children.map((item) => renderLink(item, true))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function AppShell({
  items,
  accountItems,
  profileHref,
  workspaceName,
  companyCode,
  userName,
  avatarUrl,
  roleLabel,
  notifCount,
  children,
}: {
  items: NavEntry[];
  accountItems: NavEntry[];
  profileHref: string | null;
  workspaceName: string;
  companyCode: string;
  userName: string;
  avatarUrl?: string | null;
  roleLabel: string;
  notifCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [direction, setDirection] = useState<NavigationDirection>("neutral");
  const [arrivalPace, setArrivalPace] = useState<"fast" | "normal">("normal");
  const prefetchedRoutes = useRef(new Map<string, number>());
  const queuedPrefetch = useRef<string | null>(null);
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnchor = useRef<HTMLAnchorElement | null>(null);
  const navigationStartedAt = useRef<number | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  const closeDrawer = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }, []);
  const search = searchParams.toString();
  const routeKey = search ? `${pathname}?${search}` : pathname;
  const pendingPathname = pendingHref ? routePathname(pendingHref) : null;

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

  const prefetch = useCallback((href: string, immediate = false) => {
    if (href === pathname) return;

    const prefetchedAt = prefetchedRoutes.current.get(href);
    if (prefetchedAt && Date.now() - prefetchedAt < 30_000) return;

    const runPrefetch = (nextHref: string) => {
      prefetchedRoutes.current.set(nextHref, Date.now());
      router.prefetch(nextHref);
    };

    // Sur mobile, le touchstart laisse au routeur le temps de démarrer la
    // préparation avant que le navigateur ne déclenche le clic.
    if (immediate) {
      queuedPrefetch.current = null;
      if (prefetchTimer.current) {
        clearTimeout(prefetchTimer.current);
        prefetchTimer.current = null;
      }
      runPrefetch(href);
      return;
    }

    queuedPrefetch.current = href;
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);

    prefetchTimer.current = setTimeout(() => {
      const nextHref = queuedPrefetch.current;
      queuedPrefetch.current = null;
      prefetchTimer.current = null;
      if (!nextHref) return;

      const lastPrefetchedAt = prefetchedRoutes.current.get(nextHref);
      if (lastPrefetchedAt && Date.now() - lastPrefetchedAt < 30_000) return;
      runPrefetch(nextHref);
    }, 120);
  }, [pathname, router]);

  useLayoutEffect(() => {
    // La navigation Next.js est déjà concurrente via Link ; cet état ne sert qu'à
    // donner un retour visuel immédiatement après le clic, avant le rendu suivant.
    if (navigationStartedAt.current !== null) {
      setArrivalPace(performance.now() - navigationStartedAt.current < 100 ? "fast" : "normal");
      navigationStartedAt.current = null;
    }
    setPendingHref(null);
    pendingAnchor.current?.removeAttribute("data-leti-navigation-pending");
    pendingAnchor.current = null;
    // Une route visitée pourra être préparée à nouveau lors d'un prochain
    // retour, notamment après une invalidation déclenchée par une mutation.
    prefetchedRoutes.current.delete(pathname);
  }, [pathname, routeKey]);

  useEffect(() => () => {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !mobileDrawerRef.current) return;
      const focusable = Array.from(mobileDrawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => mobileDrawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDrawer, open]);

  const startNavigation = useCallback((href: string, anchor?: HTMLAnchorElement | null, nextDirection?: NavigationDirection) => {
    if (href === routeKey) return;

    pendingAnchor.current?.removeAttribute("data-leti-navigation-pending");
    if (anchor) {
      anchor.setAttribute("data-leti-navigation-pending", "true");
      pendingAnchor.current = anchor;
    }

    setDirection(nextDirection ?? navigationDirection(routeKey, href));
    navigationStartedAt.current = performance.now();
    setPendingHref(href);
  }, [routeKey]);

  const navigate = useCallback((href: string, event: MouseEvent<HTMLAnchorElement>) => {
    // Ne pas fermer le menu ni afficher une transition pour un nouvel onglet / lien
    // modifié : le navigateur conserve alors son comportement natif.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    cancelPrefetch(href);
    startNavigation(href, event.currentTarget);
    closeMenu();
  }, [cancelPrefetch, closeMenu, startNavigation]);

  const handleInternalNavigation = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/app")) return;

    const href = `${url.pathname}${url.search}`;
    if (href === routeKey) return;
    startNavigation(href, anchor);
  }, [routeKey, startNavigation]);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      const href = `${window.location.pathname}${window.location.search}`;
      if (href !== routeKey) startNavigation(href, null, "neutral");
    };

    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, [routeKey, startNavigation]);

  return (
    <div className="min-h-screen bg-graphite-50" onClickCapture={handleInternalNavigation}>
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-graphite-100 bg-white lg:flex">
        <div className="flex h-[4.5rem] items-center px-5">
          <Link
            href="/app"
            prefetch={false}
            onClick={(event) => navigate("/app", event)}
            onPointerEnter={() => prefetch("/app")}
            onPointerLeave={() => cancelPrefetch("/app")}
            onTouchStart={() => prefetch("/app", true)}
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
            pendingHref={pendingPathname}
          />
        </div>
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 cursor-default bg-graphite-950/25" onClick={closeDrawer} aria-label="Fermer le menu" />
          <aside ref={mobileDrawerRef} role="dialog" aria-modal="true" aria-label="Navigation principale" className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-float">
            <div className="flex h-[4.5rem] items-center justify-between px-5">
              <Logo symbolEffect="sidebar" />
              <button onClick={closeDrawer} className="btn-ghost p-2" aria-label="Fermer">✕</button>
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
                pendingHref={pendingPathname}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Contenu */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center gap-3 border-b border-graphite-100 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button ref={mobileMenuButtonRef} onClick={() => setOpen(true)} className="btn-ghost p-2 lg:hidden" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/app/notifications"
              prefetch={false}
              onClick={(event) => navigate("/app/notifications", event)}
              onPointerEnter={() => prefetch("/app/notifications")}
              onPointerLeave={() => cancelPrefetch("/app/notifications")}
              onTouchStart={() => prefetch("/app/notifications", true)}
              onFocus={() => prefetch("/app/notifications")}
              onBlur={() => cancelPrefetch("/app/notifications")}
              className="relative inline-flex h-11 w-11 shrink-0 overflow-visible btn-ghost p-2"
              aria-label={notifCount > 0 ? `Notifications (${notifCount > 99 ? "99+" : notifCount} non lues)` : "Notifications"}
            >
              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", notifCount > 0 && "leti-notification-bell")}><Icon name="bell" size={21} /></span>
              {notifCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-500 px-1.5 text-[11px] font-bold leading-none text-graphite-900 ring-2 ring-white">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </Link>
            <ProfileMenu
              accountItems={accountItems}
              profileHref={profileHref}
              userName={userName}
              avatarUrl={avatarUrl}
              roleLabel={roleLabel}
              pathname={pathname}
              pendingHref={pendingPathname}
              onNavigate={navigate}
              onPrefetch={prefetch}
              onCancelPrefetch={cancelPrefetch}
            />
            <form action={signOut}>
              <button type="submit" className="btn-ghost p-2" aria-label="Se déconnecter" title="Se déconnecter">
                <Icon name="logout" size={20} />
              </button>
            </form>
          </div>
        </header>
        <main
          className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10"
          aria-busy={pendingHref !== null}
        >
          <AdaptiveRouteTransition
            routeKey={routeKey}
            direction={direction}
            pace={arrivalPace}
            pending={pendingHref !== null}
          >
            {children}
          </AdaptiveRouteTransition>
        </main>
      </div>
    </div>
  );
}
