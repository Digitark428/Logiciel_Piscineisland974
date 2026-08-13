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
  "tasks.view",
  "tasks.manage",
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
    label: "Piscines",
    items: [
      { key: "pools.view", label: "Consulter les piscines" },
      { key: "pools.edit", label: "Créer / modifier les piscines" },
    ],
  },
  {
    label: "Prestations",
    items: [
      { key: "services.view", label: "Consulter les prestations" },
      { key: "services.create", label: "Créer des prestations" },
      { key: "services.edit", label: "Modifier des prestations" },
      { key: "services.complete", label: "Réaliser / terminer une prestation" },
      { key: "planning.view", label: "Consulter le planning" },
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
  "pools.view",
  "services.view",
  "services.complete",
  "planning.view",
  "tasks.view",
  "documents.view",
];
