# PROJECT_CONTEXT.md — LETI

> Mémoire commune officielle de Codex et Claude Code. Elle contient uniquement l'état durable et vérifié du projet ; le détail des transmissions récentes est dans `AI_CHANGELOG.md`.

## Produit

LETI est le nom du SaaS de gestion destiné aux piscinistes, principalement aux TPE de 2 à 10 personnes. Les identifiants historiques GitHub et Supabase restent techniques ; le projet et l'adresse publique Vercel portent désormais le nom LETI. Les priorités produit sont la simplicité, la fiabilité, la sécurité et une interface LETI claire (bleu nuit, accents aqua et corail mesuré).

## Stack et organisation

- Next.js 14 avec App Router, TypeScript strict, Tailwind CSS et Vitest.
- Supabase fournit PostgreSQL, Auth, Storage et les politiques RLS.
- Les routes sont dans `src/app/`; les composants réutilisables dans `src/components/`.
- Les actions serveur sont organisées par domaine dans `src/lib/actions/` et retournent le format `ActionResult`.
- Les clients Supabase sont dans `src/lib/supabase/`; `admin.ts` utilise le service role côté serveur uniquement.
- Les migrations SQL sont numérotées dans `supabase/migrations/` ; la dernière migration appliquée est `20260825064057_planning_events_grant_hardening` (fichier local `20260825064042_planning_events_grant_hardening.sql`).
- La V1 est exploitée uniquement à La Réunion : toute date métier sans heure (`YYYY-MM-DD`) doit être calculée dans le fuseau `Indian/Reunion` via `src/lib/utils/date.ts`, jamais avec `toISOString().slice(0, 10)`.

## Données, sécurité et autorisations

- Une entreprise correspond à un `workspace`. Les données métier sont isolées par `workspace_id` et protégées par RLS deny-by-default.
- Le contexte et les permissions applicatives sont centralisés dans `src/lib/auth/context.ts` et `src/lib/permissions.ts`.
- Les fonctions SQL d'autorisation (`auth_is_member`, `auth_is_admin`, `auth_has_permission`, `auth_workspace_ids`, `auth_is_platform_admin`) sont utilisées par les policies RLS : ne pas les modifier sans analyse complète.
- Les montants facturés sont isolés dans `service_financials`, une table admin-only par `workspace_id` : ne jamais les ajouter à `services` ou `service_series`, qui restent lisibles par certains membres opérationnels.
- La clé `service_role` ne doit jamais être exposée au navigateur ou inscrite dans le dépôt.
- Toute évolution de schéma nécessite une nouvelle migration : ne jamais modifier une migration existante.

## Fonctionnalités actuellement présentes

- Gestion des clients, piscines, contrats d'entretien hebdomadaires, entretiens ponctuels, planning, équipe, tâches, documents, sauvegardes, notifications internes et journal d'activité. Les revenus restent réservés au gérant : montant par entretien ponctuel, montant mensuel unique par contrat et synthèse financière admin-only du tableau de bord.
- Le planning réunit les entretiens, les tâches datées en lecture seule et les événements personnels. Un événement personnel appartient au membre connecté dans son entreprise : même un gérant ou un collègue ne peut ni le lire ni le modifier. Les chantiers et dépannages restent annoncés « En développement ».
- « Tâches & Notes » est organisé en trois routes : `/app/tasks/personal`, `/app/tasks/assign` et `/app/tasks/notes`. Les to-do personnelles restent invisibles aux autres membres, y compris au gérant, et portent une priorité obligatoire (`very_urgent`, `urgent`, `not_urgent`) ainsi qu'une date et une heure facultatives.
- Les contrats hebdomadaires sont des règles durables dans `service_series` ; leurs passages futurs sont calculés à la lecture. Une ligne `services` n'est créée que lors d'un statut, commentaire, compte-rendu ou déplacement, avec `occurrence_date` immuable comme date nominale et `scheduled_date` comme éventuelle exception. Les anciennes séries restent `legacy` et leur historique n'est pas réécrit.
- Les notes d'équipe disposent d'interactions append-only isolées par entreprise : lectures, exécutions et commentaires (`team_note_reads`, `team_note_executions`, `team_note_comments`), avec contrôle RLS et trigger d'intégrité tenant.
- « Entre nous » est le fil interne privé d'une entreprise : publications texte/photos, hashtags cliquables, recherche serveur, réactions, commentaires et pagination par curseur. La galerie `/app/community/gallery` lit les médias existants sans les dupliquer et signe leurs URLs privées par lot. Les contenus et médias sont isolés par `workspace_id`, RLS et un trigger d'intégrité tenant ; le bucket `community-media` reste privé.
- La carte quotidienne représente les techniciens par photo ou initiales, conserve un repère neutre pour les passages non assignés et empile les identités lorsque plusieurs intervenants partagent une adresse.
- La barre latérale conserve le groupe repliable « Tâches & Notes » et les fonctions futures Chantiers, Dépannages et Comptabilité, toujours non interactives et marquées « En développement ». L’entrée existante LETI IA reste marquée « En développement » mais ouvre `/app/leti-ia`, une expérience d’apprentissage animée utilisant le pictogramme officiel, des particules Canvas et une bibliothèque métier locale. « Gestion » (Documents, Équipe, Sauvegardes, Journal) et « Paramètres » sont regroupés dans le menu du profil en haut à droite, avec le même filtrage par permissions que précédemment.
- Les navigations internes `/app` héritent d'une transition globale adaptative : feedback immédiat, shell persistant, fondu court sans translation, durée rapide pour une réponse quasi instantanée et skeleton différé au-delà de 300 ms. Ce standard s'applique aussi aux futures pages et respecte `prefers-reduced-motion`, sans délai artificiel.
- La fonction d'équipe (`memberships.job_title`) est distincte du rôle de sécurité (`admin` / `member`) et affichée avec l'identité du membre, avec le repli « Gérant » pour les administrateurs sans fonction renseignée.
- Portail client sous `/portal/[token]`, avec consultations d'interventions, notes client et assistance intégrée. L'assistance des utilisateurs de l'application est un volet flottant distinct, disponible uniquement dans `/app` ; le Super Admin distingue les deux origines.
- Super Admin séparé sous `/super-admin`.
- Contrats et factures sont gérés comme fichiers dans `documents`, et non comme documents générés par l'application.
- L’application expose un manifeste PWA et des icônes LETI dédiées pour une installation propre sur l’écran d’accueil mobile ; l’ouverture en mode installé démarre sur `/app`.
- Le mode démo a été retiré par la migration `0019` : ne pas réintroduire `/demo`, `seed_demo_data` ou `is_demo`.

## Intégrations et cibles autorisées

- GitHub : `Digitark428/Logiciel_Piscineisland974`, branche de production `claude/piscine-island-saas-cvvhln`.
- Vercel : `leti-app-reunion`, équipe `digitark428's projects` (`team_TpnBJ601cRvSklF9aTLzCa3R`), Functions principales en région `cdg1`.
- Production canonique : https://leti-app-reunion.vercel.app
- Supabase : projet `Piscine Island`, ref `umrjrpbritekqcfqkhxz`, région `eu-west-3`.
- Ne jamais utiliser l'ancien projet Vercel `piscineisland-logiciel` ni une éventuelle base Supabase associée.

## Règles de continuité

- `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md` et `DECISIONS.md` constituent la mémoire commune officielle.
- Garder ce fichier synthétique : mettre à jour uniquement un changement durable du projet.
- Consulter `AI_CHANGELOG.md` pour le contexte récent et `DECISIONS.md` avant une tâche susceptible de toucher une décision existante.
