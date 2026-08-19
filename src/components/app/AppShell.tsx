"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { Icon } from "./icons";
import { signOut } from "@/lib/auth/actions";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils/cn";

function NavigationLinks({
  items,
  pathname,
  onNavigate,
  onPrefetch,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
  onPrefetch: (href: string) => void;
}) {
  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        if (item.development) {
          return (
            <div key={item.href} className="flex items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-graphite-500" aria-label={`${item.label} — En développement`}>
              <Icon name={item.icon} size={19} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate">{item.label}</span>
                <span className="mt-1 inline-flex rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-graphite-500">En développement</span>
              </span>
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            onMouseEnter={() => onPrefetch(item.href)}
            onFocus={() => onPrefetch(item.href)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition",
              active
                ? "border-coral-500 bg-pool-50 text-graphite-900"
                : "text-graphite-600 hover:bg-graphite-100 hover:text-graphite-900",
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
  const closeMenu = useCallback(() => setOpen(false), []);
  const prefetch = useCallback((href: string) => router.prefetch(href), [router]);

  return (
    <div className="min-h-screen bg-graphite-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-graphite-200 bg-white lg:flex">
        <div className="flex h-[4.5rem] items-center px-5">
          <Link href="/app"><Logo /></Link>
        </div>
        <div className="px-5 pb-3">
          <div className="rounded-xl border border-graphite-200 bg-graphite-50 px-3 py-2.5">
            <div className="truncate text-sm font-semibold text-graphite-900">{workspaceName}</div>
            <div className="mt-0.5 font-mono text-[11px] text-graphite-400">{companyCode}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavigationLinks items={items} pathname={pathname} onNavigate={closeMenu} onPrefetch={prefetch} />
        </div>
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-graphite-950/25" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-float">
            <div className="flex h-[4.5rem] items-center justify-between px-5">
              <Logo />
              <button onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Fermer">✕</button>
            </div>
            <div className="px-5 pb-3">
              <div className="rounded-xl border border-graphite-200 bg-graphite-50 px-3 py-2.5">
                <div className="truncate text-sm font-semibold text-graphite-900">{workspaceName}</div>
                <div className="font-mono text-xs text-graphite-400">{companyCode}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <NavigationLinks items={items} pathname={pathname} onNavigate={closeMenu} onPrefetch={prefetch} />
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
              className="relative inline-flex h-10 w-10 shrink-0 overflow-visible btn-ghost p-2"
              aria-label={notifCount > 0 ? `Notifications (${notifCount > 99 ? "99+" : notifCount} non lues)` : "Notifications"}
            >
              <Icon name="bell" size={21} />
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
