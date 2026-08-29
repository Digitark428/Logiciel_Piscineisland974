/**
 * Permissions granulaires — doit rester synchronisé avec la fonction SQL
 * public.permission_keys() (migration 0005).
 */

export const PERMISSION_KEYS = [
  "clients.view",
  "clients.edit",
  "clients.delete",
  "pools.view",
  "pools.edit",
  "services.view",
  "services.create",
  "services.edit",
  "services.complete",
  "planning.view",
  "map.view",
  "tasks.view",
  "tasks.manage",
  "community.view",
  "community.publish",
  "documents.view",
  "documents.manage",
  "contracts.manage",
  "invoices.manage",
  "team.manage",
  "settings.manage",
  "backups.manage",
  "sensitive.view",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_GROUPS: {
  label: string;
  items: { key: PermissionKey; label: string }[];
}[] = [
  {
    label: "Clients",
    items: [
      { key: "clients.view", label: "Consulter les clients" },
      { key: "clients.edit", label: "Créer / modifier les clients" },
      { key: "clients.delete", label: "Supprimer / archiver les clients" },
      { key: "sensitive.view", label: "Voir les informations sensibles" },
    ],
  },
  {
    label: "Entretiens",
    items: [
      { key: "services.view", label: "Consulter les entretiens" },
      { key: "services.create", label: "Créer des entretiens" },
      { key: "services.edit", label: "Modifier les entretiens" },
      { key: "services.complete", label: "Réaliser / terminer un entretien" },
      { key: "planning.view", label: "Consulter le planning" },
      { key: "map.view", label: "Voir la carte des entretiens" },
    ],
  },
  {
    label: "Tâches",
    items: [
      { key: "tasks.view", label: "Consulter les tâches" },
      { key: "tasks.manage", label: "Gérer les tâches" },
    ],
  },
  {
    label: "Entre nous",
    items: [
      { key: "community.view", label: "Consulter Entre nous" },
      { key: "community.publish", label: "Publier, réagir et commenter" },
    ],
  },
  {
    label: "Documents & facturation",
    items: [
      { key: "documents.view", label: "Consulter les documents" },
      { key: "documents.manage", label: "Gérer les documents" },
      { key: "contracts.manage", label: "Gérer les contrats" },
      { key: "invoices.manage", label: "Gérer les factures" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "team.manage", label: "Gérer l'équipe" },
      { key: "settings.manage", label: "Gérer les paramètres" },
      { key: "backups.manage", label: "Gérer les sauvegardes" },
    ],
  },
];

/** Permissions par défaut proposées pour un nouveau membre "employé". */
export const DEFAULT_MEMBER_PERMISSIONS: PermissionKey[] = [
  "clients.view",
  "services.view",
  "services.complete",
  "planning.view",
  "map.view",
  "tasks.view",
  "community.view",
  "community.publish",
  "documents.view",
];
