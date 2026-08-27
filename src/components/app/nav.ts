import type { PermissionKey } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  perm?: PermissionKey;
  adminOnly?: boolean;
  development?: boolean;
  interactiveDuringDevelopment?: boolean;
  developmentTone?: "coral" | "aqua";
  description?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: string;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export function filterNavEntries(entries: NavEntry[], canShow: (item: NavItem) => boolean): NavEntry[] {
  const filtered: NavEntry[] = [];
  for (const entry of entries) {
    if (!isNavGroup(entry)) {
      if (canShow(entry)) filtered.push(entry);
      continue;
    }
    const children = entry.children.filter(canShow);
    if (children.length > 0) filtered.push({ ...entry, children });
  }
  return filtered;
}

export const MANAGEMENT_ITEMS: NavItem[] = [
  { href: "/app/documents", label: "Documents", icon: "file", perm: "documents.view" },
  { href: "/app/team", label: "Équipe", icon: "team", perm: "team.manage" },
  { href: "/app/backups", label: "Sauvegardes", icon: "backup", perm: "backups.manage" },
  { href: "/app/activity", label: "Journal", icon: "activity", adminOnly: true },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/app/settings",
  label: "Paramètres",
  icon: "settings",
  perm: "settings.manage",
};

export const ACCOUNT_NAV_ITEMS: NavEntry[] = [
  {
    key: "management",
    label: "Gestion",
    icon: "receipt",
    children: MANAGEMENT_ITEMS,
  },
  SETTINGS_ITEM,
];

export const NAV_ITEMS: NavEntry[] = [
  { href: "/app", label: "Tableau de bord", icon: "home" },
  { href: "/app/clients", label: "Mes clients", icon: "users", perm: "clients.view" },
  { href: "/app/services", label: "Mes entretiens", icon: "wrench", perm: "services.view" },
  { href: "/app/planning", label: "Planning", icon: "calendar", perm: "planning.view" },
  {
    key: "tasks-notes",
    label: "Tâches & Notes",
    icon: "check",
    children: [
      { href: "/app/tasks/personal", label: "Ma to-do personnelle", icon: "check", perm: "tasks.view" },
      { href: "/app/tasks/assign", label: "Tâches attribuées", icon: "team", perm: "tasks.view" },
      { href: "/app/tasks/notes", label: "Notes d'équipe", icon: "community", perm: "tasks.view" },
    ],
  },
  { href: "/app/map", label: "Carte", icon: "map", perm: "map.view" },
  { href: "/app/community", label: "Entre nous", icon: "community", perm: "community.view" },
  { href: "/app/chantiers", label: "Mes chantiers", icon: "wrench", development: true, developmentTone: "coral" },
  { href: "/app/depannages", label: "Mes dépannages", icon: "wrench", development: true, developmentTone: "coral" },
  {
    href: "/app/leti-ia",
    label: "LETI IA",
    icon: "sparkles",
    development: true,
    interactiveDuringDevelopment: true,
    developmentTone: "aqua",
    description: "Accéder à la puissance LETI",
  },
];
