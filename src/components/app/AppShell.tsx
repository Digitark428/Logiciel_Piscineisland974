"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { Icon } from "./icons";
import { signOut } from "@/lib/auth/actions";
import type { NavItem } from "./nav";
import { cn } from "@/lib/utils/cn";

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
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const NavLinks = () => (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            isActive(item.href)
              ? "bg-pool-50 text-pool-700"
              : "text-graphite-600 hover:bg-graphite-100 hover:text-graphite-900",
          )}
        >
          <Icon name={item.icon} size={19} />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-graphite-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-graphite-100 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/app"><Logo /></Link>
        </div>
        <div className="px-5 pb-3">
          <div className="rounded-xl bg-graphite-50 px-3 py-2">
            <div className="truncate text-sm font-semibold text-graphite-900">{workspaceName}</div>
            <div className="font-mono text-xs text-graphite-400">{companyCode}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks />
        </div>
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-graphite-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-float">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Fermer">✕</button>
            </div>
            <div className="px-5 pb-3">
              <div className="rounded-xl bg-graphite-50 px-3 py-2">
                <div className="truncate text-sm font-semibold text-graphite-900">{workspaceName}</div>
                <div className="font-mono text-xs text-graphite-400">{companyCode}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2"><NavLinks /></div>
          </aside>
        </div>
      )}

      {/* Contenu */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-graphite-100 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="btn-ghost p-2 lg:hidden" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/app/notifications" className="relative btn-ghost p-2" aria-label="Notifications">
              <Icon name="bell" size={21} />
              {notifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
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
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
