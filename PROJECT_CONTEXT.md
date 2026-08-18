# PROJECT_CONTEXT.md — Piscine Island

> Mémoire commune officielle de Codex et Claude Code. Elle contient uniquement l'état durable et vérifié du projet ; le détail des transmissions récentes est dans `AI_CHANGELOG.md`.

## Produit

Piscine Island est un SaaS de gestion destiné aux piscinistes, principalement aux TPE de 2 à 10 personnes. Les priorités produit sont la simplicité, la fiabilité, la sécurité et une interface sobre blanc / graphite / bleu piscine.

## Stack et organisation

- Next.js 14 avec App Router, TypeScript strict, Tailwind CSS et Vitest.
- Supabase fournit PostgreSQL, Auth, Storage et les politiques RLS.
- Les routes sont dans `src/app/`; les composants réutilisables dans `src/components/`.
- Les actions serveur sont organisées par domaine dans `src/lib/actions/` et retournent le format `ActionResult`.
- Les clients Supabase sont dans `src/lib/supabase/`; `admin.ts` utilise le service role côté serveur uniquement.
- Les migrations SQL sont numérotées dans `supabase/migrations/` ; l'état connu va de `0001` à `0029`.
- La V1 est exploitée uniquement à La Réunion : toute date métier sans heure (`YYYY-MM-DD`) doit être calculée dans le fuseau `Indian/Reunion` via `src/lib/utils/date.ts`, jamais avec `toISOString().slice(0, 10)`.

## Données, sécurité et autorisations

- Une entreprise correspond à un `workspace`. Les données métier sont isolées par `workspace_id` et protégées par RLS deny-by-default.
- Le contexte et les permissions applicatives sont centralisés dans `src/lib/auth/context.ts` et `src/lib/permissions.ts`.
- Les fonctions SQL d'autorisation (`auth_is_member`, `auth_is_admin`, `auth_has_permission`, `auth_workspace_ids`, `auth_is_platform_admin`) sont utilisées par les policies RLS : ne pas les modifier sans analyse complète.
- Les montants facturés sont isolés dans `service_financials`, une table admin-only par `workspace_id` : ne jamais les ajouter à `services` ou `service_series`, qui restent lisibles par certains membres opérationnels.
- La clé `service_role` ne doit jamais être exposée au navigateur ou inscrite dans le dépôt.
- Toute évolution de schéma nécessite une nouvelle migration : ne jamais modifier une migration existante.

## Fonctionnalités actuellement présentes

- Gestion des clients, piscines, entretiens ponctuels ou récurrents, planning, équipe, tâches, documents, sauvegardes, notifications internes et journal d'activité. Les revenus restent réservés au gérant : montant par prestation ponctuelle, montant mensuel unique par série récurrente et synthèse financière admin-only du tableau de bord.
- Les notes d'équipe disposent d'interactions append-only isolées par entreprise : lectures, exécutions et commentaires (`team_note_reads`, `team_note_executions`, `team_note_comments`), avec contrôle RLS et trigger d'intégrité tenant.
- Portail client sous `/portal/[token]`, avec consultations d'interventions, notes client et assistance intégrée. L'assistance des utilisateurs de l'application est un volet flottant distinct, disponible uniquement dans `/app` ; le Super Admin distingue les deux origines.
- Super Admin séparé sous `/super-admin`.
- Contrats et factures sont gérés comme fichiers dans `documents`, et non comme documents générés par l'application.
- Le mode démo a été retiré par la migration `0019` : ne pas réintroduire `/demo`, `seed_demo_data` ou `is_demo`.

## Intégrations et cibles autorisées

- GitHub : `Digitark428/Logiciel_Piscineisland974`, branche de production `claude/piscine-island-saas-cvvhln`.
- Vercel : `logiciel-piscineisland974-eu7f`, équipe `digitark428's projects` (`team_TpnBJ601cRvSklF9aTLzCa3R`).
- Production : https://logiciel-piscineisland974-eu7f.vercel.app
- Supabase : projet `Piscine Island`, ref `umrjrpbritekqcfqkhxz`, région `eu-west-3`.
- Ne jamais utiliser l'ancien projet Vercel `piscineisland-logiciel` ni une éventuelle base Supabase associée.

## Règles de continuité

- `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md` et `DECISIONS.md` constituent la mémoire commune officielle.
- Garder ce fichier synthétique : mettre à jour uniquement un changement durable du projet.
- Consulter `AI_CHANGELOG.md` pour le contexte récent et `DECISIONS.md` avant une tâche susceptible de toucher une décision existante.
