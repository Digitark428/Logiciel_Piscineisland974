"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/app/tasks/personal", label: "Ma to-do list personnelle" },
  { href: "/app/tasks/assign", label: "Attribuer une tâche" },
  { href: "/app/tasks/notes", label: "Notes d'équipe" },
];

export function TasksSubnav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections Tâches & Notes" className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-xl border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-pool-300 bg-pool-50 text-graphite-900"
                : "border-graphite-200 bg-white text-graphite-600 hover:border-pool-200 hover:text-graphite-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
