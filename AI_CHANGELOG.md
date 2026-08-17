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
