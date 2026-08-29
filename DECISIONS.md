# DECISIONS.md — Décisions durables

> Conserver ici les décisions qui ne doivent pas être rediscutées implicitement par un autre agent. Chaque entrée doit indiquer la décision et sa raison.

## Mémoire commune Codex ↔ Claude Code

**Décision :** `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md` et `DECISIONS.md` sont la mémoire officielle partagée entre les deux agents.

**Raison :** permettre une reprise fiable du projet sans dépendre de l'historique d'une conversation unique.

## Architecture multi-tenant et sécurité

**Décision :** une entreprise est isolée par `workspace_id`, avec RLS deny-by-default et contrôles applicatifs de contexte et de permissions.

**Raison :** empêcher l'accès aux données d'une autre entreprise, y compris en cas de manipulation d'URL ou d'identifiant.

## Usage du service role Supabase

**Décision :** le client `src/lib/supabase/admin.ts` et la clé `service_role` restent strictement côté serveur.

**Raison :** cette clé contourne les protections RLS et ne doit jamais être accessible au navigateur.

## Évolution du schéma

**Décision :** toute modification de base de données passe par une nouvelle migration dans `supabase/migrations/`; les migrations existantes sont immuables.

**Raison :** conserver la synchronisation et la traçabilité entre le dépôt et Supabase.

## Factures et contrats

**Décision :** les factures et contrats sont des fichiers stockés dans `documents`, importés depuis la fiche client ; l'application ne les génère pas.

**Raison :** ce comportement correspond au périmètre fonctionnel actuel.

## Données financières des entretiens

**Décision :** les montants facturés sont conservés dans `service_financials`, reliés soit à une prestation ponctuelle, soit à une seule `service_series` récurrente, avec RLS réservée aux admins du workspace.

**Raison :** `services` et `service_series` peuvent être consultés par des membres opérationnels. Cette séparation empêche toute lecture ou modification financière par un employé et évite de dupliquer le revenu mensuel sur les occurrences techniques d'un contrat.

## Contrats d'entretien hebdomadaires

**Décision :** un contrat hebdomadaire est conservé comme règle unique `weekly_contract` dans `service_series`. Ses passages sont calculés pour la période affichée et ne deviennent des lignes `services` que lorsqu'un utilisateur enregistre un statut, un commentaire, un compte-rendu ou une exception. `occurrence_date` conserve la date nominale ; `scheduled_date` porte un éventuel déplacement.

**Raison :** éviter la création arbitraire de 52 occurrences, permettre une navigation sans limite de semaine, conserver les exceptions et l'historique sans modifier rétroactivement le contrat ni les anciennes séries `legacy`.

## Périmètre de gestion des piscines

**Décision :** LETI ne propose actuellement aucune gestion d’une piscine comme entité rattachée à un client. Les routes, formulaires, fiches, sélecteurs, permissions visibles et exports correspondants restent absents. Le schéma et le code serveur historiques ne sont pas supprimés afin de préserver les données existantes ; ils restent dormants, à l’exception des replis internes d’adresse/GPS nécessaires aux anciens entretiens. Les termes décrivant le métier ou un type d’intervention, comme « Entretien piscine », restent valides.

**Raison :** ne pas annoncer une fonctionnalité qui n’appartient pas encore au produit, tout en évitant une suppression destructive des données et toute régression sur l’historique des entretiens.

## Mode démo

**Décision :** le mode démo reste retiré et ne doit pas être réintroduit.

**Raison :** la migration `0019_remove_demo.sql` a supprimé cette mécanique de l'état actuel du projet.

## Galerie de la communauté

**Décision :** la galerie `/app/community/gallery` est une vue des lignes `community_post_media` existantes ; elle ne copie ni le fichier Storage ni ses métadonnées et régénère uniquement des URLs privées signées.

**Raison :** conserver une source unique par photo, éviter les incohérences de suppression et maintenir l'isolation du bucket privé par entreprise.

## Sauvegardes professionnelles

**Décision :** une sauvegarde LETI est une archive ZIP privée admin-only, générée par un workflow durable à partir d’un instantané paginé. Elle contient un PDF de lecture, un XLSX exhaustif et les fichiers métier disponibles. Le cron Vercel s’exécute une fois par jour à 00:05 UTC ; il crée une exécution idempotente par date locale, puis chaque workflow attend sans consommation active le prochain 21 h dans `workspaces.timezone`. Il n’existe aucune suppression ou rétention automatique.

**Raison :** dissocier l’ordonnancement des traitements lourds, rendre les reprises idempotentes, éviter les limites d’une requête HTTP synchrone et respecter le fuseau de chaque entreprise sans multiplier les crons. L’absence de rétention automatique préserve l’historique demandé ; la suppression reste une action explicite du gérant.

## Périmètre des données de sauvegarde

**Décision :** le catalogue d’export est explicite et orienté métier. Il exclut les secrets portail, identifiants Auth, journaux techniques, notifications, to-do et événements personnels ; les nouvelles photos « Entre nous » conservent leur original en plus du WebP d’affichage, tandis que l’historique exporte le meilleur fichier déjà disponible.

**Raison :** une sauvegarde administrative ne doit pas devenir une copie de secrets ou contourner la confidentialité personnelle, et un catalogue positif est plus sûr qu’un export implicite de toutes les tables.

## Impression hebdomadaire des entretiens

**Décision :** l’impression semaine reprend exactement la période et les filtres visibles, couvre toujours lundi à dimanche et reste volontairement limitée au jour/date, client et adresse, en A4 paysage.

**Raison :** fournir une feuille terrain lisible sans exposer les notes, montants, accès, statuts internes ou autres informations non demandées.

## Événements personnels du planning

**Décision :** les événements du planning vivent dans `planning_events`, séparés des entretiens et des tâches. Ils sont rattachés au `workspace_id` et à leur `owner_membership_id`; seul cet auteur authentifié peut les modifier ou les supprimer. Un administrateur auteur peut sélectionner un `assigned_membership_id` actif de son propre workspace : cette personne peut alors consulter l’événement, sans pouvoir l’éditer. L’assignation reste nullable pour préserver tous les événements historiques. Les tâches datées restent seulement consultables depuis le planning et continuent d'être modifiées depuis leur écran dédié.

**Raison :** permettre au gérant d’associer explicitement un rendez-vous à un membre sans élargir l’édition, empêcher toute relation inter-tenant et garder une source métier unique pour chaque type d’élément du planning.

## Logo d’entreprise dans le shell

**Décision :** le logo personnalisé est administré uniquement par un rôle autorisé, stocké dans le bucket privé `workspace-assets` sous un chemin propre au workspace et référencé par `workspaces.settings.company_logo_path`. Toute source SVG, PNG ou JPEG est validée puis normalisée côté serveur en WebP avant stockage ; les membres reçoivent seulement une URL signée.

**Raison :** fournir une identité commune à toute l’entreprise sans ajouter de champ de schéma superflu, exposer un bucket public ou laisser passer des fichiers actifs/non maîtrisés dans le header permanent.

## Cibles de production

**Décision :** les changements publiés utilisent exclusivement la branche GitHub `claude/piscine-island-saas-cvvhln`, le projet Vercel `leti-app-reunion` et le projet Supabase `umrjrpbritekqcfqkhxz`. L'adresse publique et canonique est `https://leti-app-reunion.vercel.app` ; les identifiants historiques GitHub et Supabase restent inchangés pour éviter une migration d'infrastructure inutile.

**Raison :** LETI doit être la seule marque visible et installable, tout en préservant les ressources internes dont le renommage n'apporte aucun bénéfice utilisateur. Les anciens projets `piscineisland-logiciel` et leur base éventuelle sont obsolètes.

## Proximité Vercel et Supabase

**Décision :** les Functions principales Vercel s'exécutent en région `cdg1`, au plus près de Supabase `eu-west-3`.

**Raison :** les lectures authentifiées font plusieurs appels serveur vers Supabase ; éviter un aller-retour transatlantique réduit directement la latence de navigation sans modifier la logique métier.

## Validation des sessions dans le middleware

**Décision :** le middleware valide localement la signature et l'expiration du JWT ES256 avec `getClaims`, tandis qu'au moins une vérification distante `getUser` reste conservée dans le contexte serveur authentifié.

**Raison :** supprimer l'appel Auth redondant du middleware accélère chaque navigation privée, tout en conservant la détection immédiate d'une session révoquée avant l'accès aux données métier.

## Fluidité permanente des navigations

**Décision :** toutes les vues internes `/app`, présentes et futures, utilisent le wrapper global `AdaptiveRouteTransition` dans `AppShell`. Les liens internes déclenchent un feedback immédiat ; le shell reste monté, l'entrée utilise uniquement un fondu court sans translation, la durée dépend du temps réellement observé et le skeleton reste invisible pendant les 300 premières millisecondes. Aucun délai d'affichage artificiel n'est ajouté, et l'animation est neutralisée avec `prefers-reduced-motion`.

**Raison :** absorber les micro-latences sans ralentir les routes rapides ni accentuer visuellement leur délai, éviter les écrans blancs et garantir automatiquement une sensation cohérente sur les futures navigations LETI.

## Checkbox officielle LETI

**Décision :** toute véritable case à cocher présente ou future utilise le composant partagé `src/components/ui/Checkbox.tsx`. L’état coché est menthe lorsqu’il représente l’achèvement d’une tâche et bleu piscine lorsqu’il représente uniquement une sélection ; les interrupteurs ON/OFF restent des switches lorsqu’ils existent.

**Raison :** conserver une seule source de vérité accessible pour la forme, le focus, les états checked, disabled et indeterminate, sans disperser de styles locaux ni créer d’ambiguïté métier.
