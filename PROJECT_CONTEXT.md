# PROJECT_CONTEXT.md — LETI

> Mémoire commune officielle de Codex et Claude Code. Elle contient uniquement l'état durable et vérifié du projet ; le détail des transmissions récentes est dans `AI_CHANGELOG.md`.

## Produit

LETI est le nom du SaaS de gestion destiné aux piscinistes, principalement aux TPE de 2 à 10 personnes. Les identifiants historiques GitHub et Supabase restent techniques ; le projet et l'adresse publique Vercel portent désormais le nom LETI. Les priorités produit sont la simplicité, la fiabilité, la sécurité et une interface LETI claire (bleu nuit, accents aqua et corail mesuré).

## Stack et organisation

- Next.js 14 avec App Router, TypeScript strict, Tailwind CSS et Vitest.
- Supabase fournit PostgreSQL, Auth, Storage et les politiques RLS.
- Les routes sont dans `src/app/`; les composants réutilisables dans `src/components/`.
- Toutes les véritables cases à cocher utilisent `src/components/ui/Checkbox.tsx`, source unique du design LETI : menthe pour une action terminée et bleu piscine pour une simple sélection, sans remplacer les interrupteurs métier.
- Les actions serveur sont organisées par domaine dans `src/lib/actions/` et retournent le format `ActionResult`.
- Les clients Supabase sont dans `src/lib/supabase/`; `admin.ts` utilise le service role côté serveur uniquement.
- Les migrations SQL sont numérotées dans `supabase/migrations/` ; la dernière migration appliquée est `20260827181403_workspace_branding_and_planning_assignees` (fichier local `20260827133712_workspace_branding_and_planning_assignees.sql`).
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
- Le planning réunit les entretiens, les tâches datées en lecture seule et les événements du planning. Leur auteur conserve seul l’édition et la suppression ; un administrateur peut les associer à un membre actif de sa propre entreprise, qui obtient alors une lecture seule. Les événements historiques sans personne concernée restent valides. Les chantiers et dépannages restent annoncés « En développement ».
- « Tâches & Notes » est organisé en trois routes : `/app/tasks/personal`, `/app/tasks/assign` et `/app/tasks/notes`. Les to-do personnelles restent invisibles aux autres membres, y compris au gérant, et portent une priorité obligatoire (`very_urgent`, `urgent`, `not_urgent`) ainsi qu'une date et une heure facultatives.
- Les contrats hebdomadaires sont des règles durables dans `service_series` ; leurs passages futurs sont calculés à la lecture. Une ligne `services` n'est créée que lors d'un statut, commentaire, compte-rendu ou déplacement, avec `occurrence_date` immuable comme date nominale et `scheduled_date` comme éventuelle exception. Les anciennes séries restent `legacy` et leur historique n'est pas réécrit.
- Les notes d'équipe forment un flux professionnel compact avec composeur repliable, accusés « Lu » / « Fait » optimistes et commentaires chargés puis ajoutés inline ; leurs interactions append-only (`team_note_reads`, `team_note_executions`, `team_note_comments`) restent isolées par entreprise avec contrôle RLS et trigger d'intégrité tenant.
- « Entre nous » est le fil interne privé d'une entreprise : publications texte/photos, hashtags cliquables, recherche serveur, réactions, commentaires et pagination par curseur. La galerie `/app/community/gallery` lit les médias existants sans les dupliquer et signe leurs URLs privées par lot ; sa lightbox globale est partagée avec le feed. Les sources photo mobiles sont envoyées directement vers un chemin temporaire signé, puis validées et normalisées côté serveur (orientation, dimensions, WebP), notamment pour HEIC/HEIF, sans exposer la clé privilégiée. Les contenus et médias restent isolés par `workspace_id`, RLS et trigger d'intégrité tenant ; le bucket `community-media` reste privé.
- La carte quotidienne représente les techniciens par photo ou initiales, conserve un repère neutre pour les passages non assignés et empile les identités lorsque plusieurs intervenants partagent une adresse.
- La barre latérale suit l’ordre durable : Tableau de bord, Mes clients, Mes entretiens, Planning, Tâches & Notes, Carte, Entre nous, Mes chantiers, Mes dépannages et LETI IA. La comptabilité n’est plus exposée dans la navigation ; son éventuel code dormant n’est pas supprimé de façon destructive. Chantiers et Dépannages restent non interactifs et marqués « En développement ». LETI IA reste marqué « En développement » mais ouvre `/app/leti-ia`, avec particules Canvas, phrases accélérées et pulsation calme du symbole. « Gestion » (Documents, Équipe, Sauvegardes, Journal) et « Paramètres » restent dans le menu du profil avec leur filtrage par permissions.
- Le header persistant affiche au centre le logo personnalisé de l’entreprise lorsqu’il existe. Seul un administrateur peut l’ajouter, le remplacer ou le retirer ; les sources SVG, PNG et JPEG sont contrôlées, orientées et normalisées côté serveur en WebP dans le bucket privé `workspace-assets`, puis signées pour les membres du workspace.
- Les couches globales, hauteurs du shell et largeur de drawer sont centralisées dans les tokens CSS LETI. Les drawers et modales partagés utilisent un Portal et déclarent leur type ; le launcher « Aide & retours » se décale devant un drawer droit, se réduit selon le breakpoint ou disparaît pendant un overlay bloquant afin de ne jamais couvrir une action métier.
- Les navigations internes `/app` héritent d'une transition globale adaptative : feedback immédiat, shell persistant, fondu court sans translation, durée rapide pour une réponse quasi instantanée et skeleton différé au-delà de 300 ms. Ce standard s'applique aussi aux futures pages et respecte `prefers-reduced-motion`, sans délai artificiel.
- La fonction d'équipe (`memberships.job_title`) est distincte du rôle de sécurité (`admin` / `member`) et affichée avec l'identité du membre, avec le repli « Gérant » pour les administrateurs sans fonction renseignée.
- Portail client sous `/portal/[token]`, avec consultations d'interventions, notes client et assistance intégrée. L'assistance des utilisateurs de l'application est un volet flottant distinct, disponible uniquement dans `/app`, conscient des overlays globaux ; le Super Admin distingue les deux origines.
- Super Admin séparé sous `/super-admin`.
- Contrats et factures sont gérés comme fichiers dans `documents`, et non comme documents générés par l'application.
- L’application expose un manifeste PWA et des icônes LETI dédiées pour une installation propre sur l’écran d’accueil mobile ; l’ouverture en mode installé démarre sur `/app`.
- Le mode démo a été retiré par la migration `0019` : ne pas réintroduire `/demo`, `seed_demo_data` ou `is_demo`.

## Intégrations et cibles autorisées

- GitHub : `Digitark428/Logiciel_Piscineisland974`, branche de production `claude/piscine-island-saas-cvvhln`.
- Vercel : `leti-app-reunion`, équipe `digitark428's projects` (`team_TpnBJ601cRvSklF9aTLzCa3R`), Functions principales en région `cdg1`.
- Production canonique : https://leti-app-reunion.vercel.app ; l'ancienne adresse Vercel redirige en 308 vers celle-ci pour préserver les favoris existants.
- Supabase : projet `Piscine Island`, ref `umrjrpbritekqcfqkhxz`, région `eu-west-3`.
- Ne jamais utiliser l'ancien projet Vercel `piscineisland-logiciel` ni une éventuelle base Supabase associée.

## Règles de continuité

- `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md` et `DECISIONS.md` constituent la mémoire commune officielle.
- Garder ce fichier synthétique : mettre à jour uniquement un changement durable du projet.
- Consulter `AI_CHANGELOG.md` pour le contexte récent et `DECISIONS.md` avant une tâche susceptible de toucher une décision existante.
