import type { SupportCategory, SupportStatus } from "@/lib/db/types";

/**
 * Constantes partagées du module Assistance (client & serveur).
 * Aucune dépendance serveur ici : ce fichier est importable dans un composant client.
 * Architecture volontairement ouverte : ajouter une catégorie = une entrée ci-dessous.
 */

export interface CategoryMeta {
  key: SupportCategory;
  emoji: string;
  /** Libellé du bouton de choix côté client. */
  choice: string;
  /** Libellé court (Super Admin, badges). */
  label: string;
  /** Titre du champ de saisie, adapté à la catégorie. */
  prompt: string;
  /** Exemple affiché en placeholder du champ. */
  example: string;
}

export const SUPPORT_CATEGORIES: CategoryMeta[] = [
  {
    key: "bug",
    emoji: "🐛",
    choice: "Signaler un bug",
    label: "Bug",
    prompt: "Décrivez votre bug",
    example: "Quand je clique sur Terminer la prestation, rien ne se passe.",
  },
  {
    key: "help",
    emoji: "❓",
    choice: "Demander de l'aide",
    label: "Aide",
    prompt: "Dites-nous comment nous pouvons vous aider",
    example: "Je ne comprends pas comment créer une prestation récurrente.",
  },
  {
    key: "suggestion",
    emoji: "💡",
    choice: "Proposer une suggestion",
    label: "Suggestion",
    prompt: "Quelle amélioration souhaitez-vous nous proposer ?",
    example: "Ce serait pratique de pouvoir ajouter plusieurs photos depuis le planning.",
  },
];

export const CATEGORY_BY_KEY: Record<SupportCategory, CategoryMeta> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((c) => [c.key, c]),
) as Record<SupportCategory, CategoryMeta>;

export function isSupportCategory(v: unknown): v is SupportCategory {
  return v === "bug" || v === "help" || v === "suggestion";
}

export function isSupportStatus(v: unknown): v is SupportStatus {
  return v === "new" || v === "in_progress" || v === "resolved" || v === "closed";
}

export interface StatusMeta {
  key: SupportStatus;
  emoji: string;
  label: string;
  /** Classe de teinte (badge). */
  tone: string;
}

export const SUPPORT_STATUSES: StatusMeta[] = [
  { key: "new", emoji: "🔴", label: "Nouveau", tone: "bg-red-50 text-red-700" },
  { key: "in_progress", emoji: "🟠", label: "En cours", tone: "bg-amber-50 text-amber-700" },
  { key: "resolved", emoji: "🟢", label: "Résolu", tone: "bg-emerald-50 text-emerald-700" },
  { key: "closed", emoji: "⚪", label: "Fermé", tone: "bg-graphite-100 text-graphite-500" },
];

export const STATUS_BY_KEY: Record<SupportStatus, StatusMeta> = Object.fromEntries(
  SUPPORT_STATUSES.map((s) => [s.key, s]),
) as Record<SupportStatus, StatusMeta>;

/** Limite de longueur d'un message (garde-fou côté serveur & client). */
export const SUPPORT_MESSAGE_MAX = 4000;
