# AGENTS.md — LETI

## Mission
LETI est un SaaS multi-tenant de gestion pour piscinistes (TPE de 2 à 10 personnes). Les priorités sont la simplicité, la fiabilité, la sécurité et une interface sobre. Les noms historiques du dépôt et de l'infrastructure restent inchangés tant qu'une évolution technique distincte n'est pas demandée.

Pour les détails de conception et l’historique, consulter `ARCHITECTURE.md`, `README.md` et `CLAUDE.md` seulement si la tâche le nécessite. Ne jamais inscrire de secret dans ce fichier ni dans le dépôt.

## LETI — Design System & UI Guidelines

- **Marque visible :** LETI est la marque affichée à l'utilisateur. Ne jamais redessiner le logo : utiliser exclusivement les assets officiels de `public/leti/` et leurs recadrages techniques fidèles. Tout nouveau contenu visible remplace « Piscine Island » par « LETI » ; les identifiants techniques, cibles d'infrastructure et données existantes restent inchangés.
- **Palette :** bleu nuit `#183A59` pour la structure et les textes, corail `#F48B82` comme accent mesuré, corail clair `#F7B7AE`, bleu piscine `#78D8EC`, bleu aqua `#5FC6E3` et blanc cassé `#F7F7F5`. L'interface reste majoritairement claire ; le corail n'est jamais un fond dominant.
- **Fondations :** Inter (avec une pile système de repli), espacement 4/8/12/16/24/32, rayons 8 puis 14-16 px, bordures fines et ombres très douces. Réutiliser les tokens Tailwind et les composants partagés avant toute classe ou couleur locale.
- **Composants :** `src/components/ui.tsx`, `AppShell` et les primitives `.card`, `.btn-*`, `.input`, `.label` constituent le socle. Une évolution d'usage commun se fait à la source, avec une action principale claire par zone.
- **Responsive et accessibilité :** le mobile est un usage terrain prioritaire : ne pas comprimer un tableau desktop, préserver des zones tactiles d'au moins 44 px, le focus visible, le contraste et `prefers-reduced-motion`. Vérifier 375-430 px, 768-1024 px, 1280-1440 px et grand écran avant livraison.
- **Splash :** `SplashScreen` est une couche de présentation non bloquante, jouée uniquement au chargement initial du layout (symbole officiel puis wordmark). Il ne doit jamais modifier Auth, les redirections, les permissions ou la navigation interne.
- **Fluidité permanente :** toute nouvelle page, fiche, vue, entrée de menu, sous-menu, onglet ou navigation interne sous `/app` doit conserver le shell partagé et passer par le système global `AdaptiveRouteTransition`. Le feedback commence au clic et l'entrée utilise uniquement un fondu court, sans translation ; aucune attente artificielle n'est autorisée, le skeleton ne se révèle qu'après une latence durable et `prefers-reduced-motion` doit rester respecté. Les liens internes standards en héritent automatiquement ; toute navigation programmatique doit préserver le même feedback au lieu de contourner le système.
- **Non-régression :** toute refonte LETI reste strictement visuelle. Ne modifier ni Supabase, ni RLS, ni schéma, ni actions métier, ni routes, ni permissions sans demande explicite distincte.

## Cibles autorisées
Utiliser exclusivement ces ressources, sauf instruction explicite du propriétaire :

- GitHub : `Digitark428/Logiciel_Piscineisland974`
- Branche de production : `claude/piscine-island-saas-cvvhln`
- Vercel : `logiciel-piscineisland974-eu7f` (équipe `digitark428's projects`, `team_TpnBJ601cRvSklF9aTLzCa3R`)
- Production : https://logiciel-piscineisland974-eu7f.vercel.app
- Supabase : `Piscine Island`, ref `umrjrpbritekqcfqkhxz`, région `eu-west-3`

Ne jamais utiliser l’ancien projet Vercel `piscineisland-logiciel` ni une éventuelle base Supabase associée : ils sont obsolètes.

## Workflow collaboratif Codex ↔ Claude Code
- Avant toute intervention importante, lire `AGENTS.md`, puis `PROJECT_CONTEXT.md` et les dernières entrées de `AI_CHANGELOG.md`.
- Consulter `DECISIONS.md` si la tâche peut toucher une décision existante, et `CLAUDE.md` si des informations laissées par Claude Code peuvent être pertinentes.
- Après une intervention significative, ajouter une entrée concise dans `AI_CHANGELOG.md`.
- Mettre à jour `PROJECT_CONTEXT.md` seulement si l'état durable du projet a changé ; mettre à jour `DECISIONS.md` seulement lorsqu'une véritable décision importante a été prise.
- Ces trois fichiers constituent la mémoire commune officielle. Ne jamais y inscrire de secrets, d'hypothèses ou de détails inutiles.

## Processus de travail
- Les actions en lecture peuvent être faites directement.
- Avant toute modification, migration, commit, push ou déploiement : présenter un plan concis et attendre la validation explicite du propriétaire (« valide »).
- Une fois validé, prendre en charge la tâche de bout en bout : code, base de données si nécessaire, commit/push, déploiement Vercel et vérification réelle.
- Les opérations destructrices ou irréversibles (suppression de données, table, colonne, projet, déploiement, ou changement de cible d’infrastructure) exigent une confirmation explicite supplémentaire.
- Rapporter uniquement l’état vérifié, jamais un résultat supposé.

## Vérifications avant livraison
Exécuter lorsque pertinent :

```bash
npm run build
npm run test
npm run typecheck
```

Un push sur la branche de production déclenche le déploiement Vercel. Vérifier que le déploiement de production est `READY` et que l’URL publique pointe vers lui.

## Stack et architecture
- Next.js 14 (App Router), TypeScript strict, Tailwind, Vitest.
- Supabase : Postgres, Auth, Storage et RLS.
- Architecture multi-tenant : chaque table métier porte `workspace_id` ; RLS deny-by-default.
- Clients Supabase : `src/lib/supabase/{client,server,admin}.ts`. `admin.ts` utilise le service role et ne doit jamais atteindre le navigateur.
- Auth/permissions : `src/lib/auth/context.ts` (`requireContext`, `can`, `requirePermission`) et `src/lib/permissions.ts`.
- Actions serveur par domaine : `src/lib/actions/`, avec le format `ActionResult` et `ActionForm`.
- Super Admin : `platform_admins`, `src/lib/auth/superadmin.ts`, route `/super-admin`.
- Notifications : in-app uniquement en V1 (pas d’e-mail/Resend).

## Base de données et migrations
- Les migrations sont dans `supabase/migrations/` ; la dernière migration appliquée est `20260825064057_planning_events_grant_hardening` (fichier local `20260825064042_planning_events_grant_hardening.sql`).
- Toute évolution de schéma doit créer une nouvelle migration numérotée : ne jamais modifier une migration existante.
- Appliquer les migrations à la bonne base Supabase, vérifier concrètement le résultat (tables, colonnes, fonctions) et lancer les contrôles de sécurité/performance.
- Après application, committer la migration afin de maintenir le dépôt et la base synchronisés.
- Ne jamais exposer de clé service role ni de donnée sensible côté client.

## Repères fonctionnels importants
- Le mode démo a été entièrement supprimé : ne pas réintroduire `/demo`, `seed_demo_data` ni `is_demo`.
- Factures et contrats sont des fichiers stockés dans `documents`, importés depuis la fiche client, pas des documents générés par l’application.
- Le portail client utilise `/portal/[token]` ; l’assistance intégrée passe par `support_conversations` et `support_messages`.
- Les fonctions d’autorisation SQL (`auth_is_member`, `auth_is_admin`, `auth_has_permission`, `auth_workspace_ids`, `auth_is_platform_admin`) sont essentielles aux policies RLS : ne pas modifier leurs permissions sans analyse complète.
- Si un trigger est lancé par un utilisateur authentifié, vérifier soigneusement les droits de la fonction SQL appelée.

## Pièges connus
- Le projet Vercel doit conserver le preset Next.js (`vercel.json`) pour éviter l’erreur de répertoire `public`.
- Les variables Vercel requises doivent exister en Production, Preview et Development.
- Les e-mails Supabase sont uniques globalement : en V1, une adresse e-mail ne peut appartenir qu’à un seul workspace.
- `npm run bootstrap` crée le Super Admin et exige les variables locales appropriées.
