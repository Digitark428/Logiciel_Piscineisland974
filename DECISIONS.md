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

## Mode démo

**Décision :** le mode démo reste retiré et ne doit pas être réintroduit.

**Raison :** la migration `0019_remove_demo.sql` a supprimé cette mécanique de l'état actuel du projet.

## Galerie de la communauté

**Décision :** la galerie `/app/community/gallery` est une vue des lignes `community_post_media` existantes ; elle ne copie ni le fichier Storage ni ses métadonnées et régénère uniquement des URLs privées signées.

**Raison :** conserver une source unique par photo, éviter les incohérences de suppression et maintenir l'isolation du bucket privé par entreprise.

## Cibles de production

**Décision :** les changements publiés utilisent exclusivement la branche GitHub `claude/piscine-island-saas-cvvhln`, le projet Vercel `logiciel-piscineisland974-eu7f` et le projet Supabase `umrjrpbritekqcfqkhxz`.

**Raison :** les anciens projets `piscineisland-logiciel` et leur base éventuelle sont obsolètes.

## Proximité Vercel et Supabase

**Décision :** les Functions principales Vercel s'exécutent en région `cdg1`, au plus près de Supabase `eu-west-3`.

**Raison :** les lectures authentifiées font plusieurs appels serveur vers Supabase ; éviter un aller-retour transatlantique réduit directement la latence de navigation sans modifier la logique métier.

## Validation des sessions dans le middleware

**Décision :** le middleware valide localement la signature et l'expiration du JWT ES256 avec `getClaims`, tandis qu'au moins une vérification distante `getUser` reste conservée dans le contexte serveur authentifié.

**Raison :** supprimer l'appel Auth redondant du middleware accélère chaque navigation privée, tout en conservant la détection immédiate d'une session révoquée avant l'accès aux données métier.

## Fluidité permanente des navigations

**Décision :** toutes les vues internes `/app`, présentes et futures, utilisent le wrapper global `AdaptiveRouteTransition` dans `AppShell`. Les liens internes déclenchent un feedback immédiat ; le shell reste monté, l'entrée se limite à `opacity` et `transform`, la durée dépend du temps réellement observé et le skeleton reste invisible pendant les 300 premières millisecondes. Aucun délai d'affichage artificiel n'est ajouté, et le mouvement est neutralisé avec `prefers-reduced-motion`.

**Raison :** absorber les micro-latences sans ralentir les routes rapides, éviter les écrans blancs et garantir automatiquement une sensation cohérente sur les futures navigations LETI.
