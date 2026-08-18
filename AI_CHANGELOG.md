# AI_CHANGELOG.md — Transmissions Codex ↔ Claude Code

> Ajouter une entrée courte après chaque intervention significative. Ne pas y dupliquer la documentation durable de `PROJECT_CONTEXT.md`.

## 2026-08-17 — Codex — Workflow collaboratif initialisé

- **Tâche :** création de la mémoire commune et ajout des règles de continuité dans `AGENTS.md` et `CLAUDE.md`.
- **Fichiers :** `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md`, `DECISIONS.md`, `AGENTS.md`, `CLAUDE.md`.
- **Migrations :** aucune.
- **À surveiller :** `ARCHITECTURE.md` et `README.md` contiennent encore des références historiques au mode démo ; la mémoire commune décrit l'état actuel vérifié.
- **Reste à faire :** aucune action fonctionnelle liée à ce workflow.

## 2026-08-17 — Codex — Refonte éditoriale de la landing page

- **Tâche :** formulation plus professionnelle du hero, des boutons et des six cartes de la page d'accueil.
- **Fichier :** `src/app/page.tsx`.
- **Migrations :** aucune.
- **Publication :** commit GitHub `ba74a601cc2424174bdc8fba9d4980cbd9e9ec0c`, déploiement Vercel production `READY` vérifié.
- **À surveiller :** le build et le typecheck passent. Deux tests de planning échouaient dans cet environnement sur un décalage de date/fuseau horaire, sans lien avec la landing page.

## 2026-08-17 — Codex — Finition verre des boutons

- **Tâche :** harmonisation visuelle de tous les boutons avec un reflet de surface, des dégradés, une bordure lumineuse et une profondeur discrète.
- **Fichier :** `src/app/globals.css`.
- **Migrations :** aucune.
- **Vérification :** build et typecheck validés ; deux tests Planning restent en échec sur le décalage de fuseau horaire déjà connu, sans lien avec ce changement CSS.

## 2026-08-17 — Claude Code — Intégration au workflow de mémoire commune

- **Tâche :** vérification de la mémoire commune préparée par Codex et confirmation de l'intégration de Claude Code au workflow partagé.
- **Fichiers :** lecture de `AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md`, `DECISIONS.md` ; ajout de cette entrée.
- **Constat :** les cinq fichiers existent et sont cohérents. `CLAUDE.md` contient déjà la section « Workflow collaboratif Codex ↔ Claude Code » (règles permanentes côté Claude) ; `AGENTS.md` fournit la section miroir côté Codex. Mêmes cibles infra, même état migrations (0001→0021), même périmètre fonctionnel. Aucune correction nécessaire.
- **Migrations :** aucune.
- **À surveiller :** rien de bloquant. `ARCHITECTURE.md`/`README.md` gardent des références historiques au mode démo (déjà signalé par Codex) ; la mémoire commune reste la source de vérité de l'état actuel.
- **Reste à faire :** aucune action fonctionnelle ; workflow partagé opérationnel dans les deux sens.

## 2026-08-17 — Codex — Durcissement sécurité multi-tenant

- **Tâche :** protections tenant au niveau base, permissions RLS métier, portail client, backups, uploads et correctif Next.js.
- **Migrations :** `0022_tenant_security_hardening` et `0023_portal_attempts_deny_policy`, appliquées au projet Supabase de production.
- **Vérification :** diagnostic préalable sans relation cross-workspace incohérente ; triggers et fonctions non exécutables directement par anon/authenticated ; typecheck, lint et build validés.
- **À surveiller :** les tests intégration Supabase sont conditionnels aux variables locales ; deux tests Planning restent dépendants du fuseau horaire local (antérieurs à cette intervention).

## 2026-08-18 — Codex — Fluidité, interactions de notes et carte groupée

- **Tâche :** navigation perçue instantanément (squelette d'application, préchargement au survol, requêtes parallélisées et URLs Storage groupées), ordre prioritaire du menu, en-têtes explicatifs, boutons plus légers, badge de notifications corrigé et carte regroupant les prestations d'une même adresse/client.
- **Notes d'équipe :** ajout des lectures, exécutions et commentaires en détail de note avec mises à jour optimistes ; les listes de commentaires restent différées.
- **Migrations :** `0024_team_note_interactions` et `0025_team_note_interaction_indexes`, appliquées en production ; RLS, trigger d'intégrité multi-tenant et index FK vérifiés.
- **Vérification :** typecheck et build validés ; tests unitaires/intégration exécutés (deux échecs Planning de fuseau horaire, préexistants) ; interface de connexion vérifiée sans erreur aux formats desktop, tablette et mobile.

## 2026-08-18 — Codex — Dates métier La Réunion

- **Tâche :** correction des calculs de planning qui convertissaient une date civile en UTC et pouvaient ainsi revenir à la veille entre minuit et 4 h à La Réunion.
- **Portée :** utilitaire `Indian/Reunion` partagé, planning, tableau de bord, filtres de prestations, portail client et génération de prestations récurrentes ; aucune donnée existante modifiée, aucune migration.
- **Vérification :** tests dédiés au passage de minuit et à la validation des dates civiles, puis typecheck/build.
