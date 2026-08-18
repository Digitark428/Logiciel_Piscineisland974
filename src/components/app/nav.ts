import type { PermissionKey } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // clé d'icône (rendue dans AppShell)
  perm?: PermissionKey; // permission requise pour l'afficher (admin voit tout)
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Tableau de bord", icon: "home" },
  { href: "/app/services", label: "Prestations", icon: "wrench", perm: "services.view" },
  { href: "/app/planning", label: "Planning", icon: "calendar", perm: "planning.view" },
  { href: "/app/tasks", label: "Tâches", icon: "check", perm: "tasks.view" },
  { href: "/app/map", label: "Carte", icon: "map", perm: "map.view" },
  { href: "/app/clients", label: "Clients", icon: "users", perm: "clients.view" },
  { href: "/app/documents", label: "Documents", icon: "file", perm: "documents.view" },
  { href: "/app/team", label: "Équipe", icon: "team", perm: "team.manage" },
  { href: "/app/backups", label: "Sauvegardes", icon: "backup", perm: "backups.manage" },
  { href: "/app/activity", label: "Journal", icon: "activity", adminOnly: true },
  { href: "/app/settings", label: "Paramètres", icon: "settings", perm: "settings.manage" },
];
